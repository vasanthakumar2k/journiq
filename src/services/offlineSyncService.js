/**
 * offlineSyncService.js
 *
 * Handles the offline-first sync strategy:
 * - Detect network connectivity
 * - Save to SQLite when offline (with local image paths, no S3 upload)
 * - On reconnect, sync pending SQLite entries → upload images to S3 → push to Firestore → mark as synced
 */

import NetInfo from '@react-native-community/netinfo';
import { getDBConnection } from '../database/db';
import { queries } from '../database/queries';
import { uploadToS3 } from './s3Service';
import { addStory } from './firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if the device is currently online.
 * @returns {Promise<boolean>}
 */
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  } catch {
    return false;
  }
};

/**
 * Save a story to local SQLite as an offline draft.
 * Images are stored as local file URIs (no S3 uploads yet).
 * @param {Object} storyData - { title, narrative, images: [{uri, base64}], location, tags }
 * @param {Object} user - { id, name, email }
 */
export const saveOffline = async (storyData, user) => {
  const db = await getDBConnection();
  const entryJson = JSON.stringify({
    ...storyData,
    userId: user.id,
    // Store images as local URIs (with base64 if available) for later S3 upload
    offlineImages: storyData.images,
    images: storyData.images.map(img => img.uri),
    savedOfflineAt: new Date().toISOString(),
  });

  await db.executeSql(queries.insertEntry, [
    user.name,
    user.email,
    storyData.title,
    storyData.narrative || '',
    entryJson,
    new Date().toLocaleDateString(),
    0, // synced = 0 (pending)
  ]);
  console.log('[OfflineSync] Saved story offline:', storyData.title);
};

/**
 * Syncs all unsynced SQLite entries to Firestore.
 * For each entry:
 *   1. Upload local images to S3 (using stored base64 or file URI).
 *   2. Push story metadata to Firestore.
 *   3. Mark the SQLite row as synced (synced = 1).
 * 
 * Call this when network is restored.
 */
export const syncPendingEntries = async () => {
  const online = await isOnline();
  if (!online) {
    console.log('[OfflineSync] Still offline, skipping sync.');
    return;
  }

  let db;
  try {
    db = await getDBConnection();
  } catch (dbError) {
    console.error('[OfflineSync] Could not open DB:', dbError);
    return;
  }

  let unsyncedResults;
  try {
    unsyncedResults = await db.executeSql(queries.getUnsyncedEntries);
  } catch (queryError) {
    console.error('[OfflineSync] Could not fetch unsynced entries:', queryError);
    return;
  }

  const rows = unsyncedResults[0].rows;
  if (rows.length === 0) {
    console.log('[OfflineSync] No pending entries to sync.');
    return;
  }

  console.log(`[OfflineSync] Found ${rows.length} pending entries. Syncing...`);

  // Get user session for Firestore userId
  let userId = 'anonymous';
  try {
    const sessionStr = await AsyncStorage.getItem('userSession');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      userId = session.id || session.uid || 'anonymous';
    }
  } catch (sessionError) {
    console.warn('[OfflineSync] Could not load user session:', sessionError);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows.item(i);
    let entry;

    try {
      entry = JSON.parse(row.entry_json);
    } catch {
      console.warn(`[OfflineSync] Skipping malformed entry ID ${row.id}`);
      continue;
    }

    try {
      // 1. Upload images to S3 (use stored base64 if available, fall back to URI)
      const s3Urls = [];
      const offlineImages = entry.offlineImages || entry.images.map(uri => ({ uri }));

      for (const img of offlineImages) {
        try {
          const s3Url = await uploadToS3(
            img.uri,
            `offline_${Date.now()}.jpg`,
            'image/jpeg',
            img.base64 || null,
          );
          s3Urls.push(s3Url);
        } catch (uploadErr) {
          console.warn('[OfflineSync] Image upload failed, using original URI as fallback:', uploadErr.message);
          s3Urls.push(img.uri); // fallback: keep local uri
        }
      }

      // 2. Push to Firestore
      const firestoreEntry = {
        userId: entry.userId || userId,
        title: entry.title,
        narrative: entry.narrative,
        images: s3Urls,
        location: entry.location,
        tags: entry.tags,
      };

      await addStory(entry.userId || userId, firestoreEntry);
      console.log(`[OfflineSync] Synced entry "${entry.title}" to Firestore.`);

      // 3. Mark as synced in SQLite
      await db.executeSql(queries.updateEntry, [
        entry.title,
        entry.narrative,
        JSON.stringify({ ...entry, images: s3Urls, synced: true }),
        1, // synced = 1
        row.id,
      ]);
    } catch (syncError) {
      console.error(`[OfflineSync] Failed to sync entry ID ${row.id}:`, syncError?.message || syncError);
      // Continue with next entry — do NOT crash
    }
  }

  console.log('[OfflineSync] Sync pass complete.');
};

/**
 * Starts a persistent NetInfo listener that triggers syncPendingEntries
 * whenever the device comes back online.
 * Call this once from App.js / root component.
 * @returns {Function} unsubscribe function
 */
export const startSyncOnReconnect = () => {
  let wasOffline = false;

  const unsubscribe = NetInfo.addEventListener(state => {
    const online = state.isConnected && state.isInternetReachable !== false;

    if (!online) {
      wasOffline = true;
    } else if (wasOffline && online) {
      wasOffline = false;
      console.log('[OfflineSync] Network restored. Starting sync...');
      syncPendingEntries().catch(err =>
        console.error('[OfflineSync] Sync on reconnect failed:', err),
      );
    }
  });

  return unsubscribe;
};
