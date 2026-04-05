/**
 * offlineSyncService.js
 *
 * Handles the offline-first sync strategy:
 * - Detect network connectivity
 * - Save to SQLite when offline (with local image paths, no S3 upload)
  * - On reconnect, sync pending SQLite entries → upload images to S3 → push to Firestore → mark as synced
  */

import NetInfo from '@react-native-community/netinfo';
import { uploadToS3 } from './s3Service';
import { addStory } from './firestoreService';
import { getStorageItem, setStorageItem } from './storageService';


const OFL_KEY = 'ofl_data';
const OFL_STATUS_KEY = 'oflinedata'; // Status flag as requested

let isSyncingStatus = false;
let syncStatusListeners = [];

/**
 * Register a listener for sync status changes.
 */
export const onSyncStatusChange = (callback) => {
  syncStatusListeners.push(callback);
  return () => {
    syncStatusListeners = syncStatusListeners.filter(l => l !== callback);
  };
};

const notifyStatusChange = (status) => {
  isSyncingStatus = status;
  syncStatusListeners.forEach(listener => listener(status));
};

export const getSyncStatus = () => isSyncingStatus;


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
 * Save a story to local storage as an offline draft.
 * @param {Object} storyData - { title, narrative, images: [{uri, base64}], location, tags }
 * @param {Object} user - { id, name, email }
 */
export const saveOffline = async (storyData, user) => {
  const entry = {
    ...storyData, // title, narrative, location, tags, createdAt, email
    userId: user.id || user.uid,
    userName: user.name,
    userEmail: user.email || user.userEmail,
    offlineImages: storyData.images, // Full objects with {uri, base64}
    savedOfflineAt: new Date().toISOString(),
  };

  // Save to AsyncStorage 'ofl_data'
  try {
    const existingOfl = await getStorageItem(OFL_KEY) || [];
    existingOfl.push(entry);
    await setStorageItem(OFL_KEY, existingOfl);
    
    // ✅ SET STATUS: Mark that we have offline data to sync
    await setStorageItem(OFL_STATUS_KEY, true);
    
    console.log('[OfflineSync] Saved story to AsyncStorage ofl_data key:', storyData.title);
  } catch (err) {
    console.error('[OfflineSync] Error saving to storage:', err);
  }
};


/**
 * Syncs all unsynced AsyncStorage entries to Firestore.
 * For each entry:
 *   1. Upload local images to S3 (using stored base64 or file URI).
 *   2. Push story metadata to Firestore.
 * 
 * Triggered on reconnect OR app startup.
 */
export const syncPendingEntries = async () => {
  const online = await isOnline();
  if (!online) {
    console.log('[OfflineSync] Still offline, skipping sync.');
    return;
  }

  if (isSyncingStatus) return;
  notifyStatusChange(true);

  try {
    // ✅ CHECK STATUS: Skip if no offline data is flagged
    const hasOfflineData = await getStorageItem(OFL_STATUS_KEY);
    if (!hasOfflineData) {
      console.log('[OfflineSync] No offline data flagged (oflinedata = false). Skipping sync.');
      notifyStatusChange(false); // Reset to allow future triggers
      return;
    }

    // 1. Sync from storage 'ofl_data'
    const oflEntries = await getStorageItem(OFL_KEY) || [];

    if (oflEntries.length > 0) {
      console.log(`[OfflineSync] Found ${oflEntries.length} entries in ofl_data. Syncing...`);
      
      for (const entry of oflEntries) {
        try {
          // 1. Upload images to S3 First
          const s3Urls = [];
          for (const img of (entry.offlineImages || [])) {
            if (img.isS3) {
              s3Urls.push(img.uri);
            } else {
              try {
                // Ensure unique name for offline uploads
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substr(7);
                const filename = `ofl_${timestamp}_${randomId}.jpg`;
                
                const s3Url = await uploadToS3(
                  img.uri,
                  filename,
                  'image/jpeg',
                  img.base64 || null,
                );
                s3Urls.push(s3Url);
              } catch (err) {
                console.warn('[OfflineSync] Image S3 sync failed, using local URI as fallback:', err.message);
                s3Urls.push(img.uri);
              }
            }
          }

          // 2. Build Firestore Payload with S3 URLs
          const firestoreEntry = {
            userId: entry.userId,
            email: entry.userEmail, 
            title: entry.title,
            narrative: entry.narrative,
            images: s3Urls,
            location: entry.location,
            tags: entry.tags,
            createdAt: entry.createdAt,
          };

          // 3. Push to Firestore
          await addStory(entry.userId, firestoreEntry);
          console.log(`[OfflineSync] Successfully synced story to Firestore: ${entry.title}`);

          // ✅ SUCCESS: Remove this specific item from the storage list IMMEDIATELY
          const currentOfl = await getStorageItem(OFL_KEY) || [];
          const updatedOfl = currentOfl.filter(ofl => 
            !(ofl.title === entry.title && ofl.savedOfflineAt === entry.savedOfflineAt)
          );
          await setStorageItem(OFL_KEY, updatedOfl);
          
        } catch (err) {
          console.error(`[OfflineSync] Critical failure syncing entry: ${entry.title}`, err);
          // If it fails, it stays in the list for the next attempt
        }
      }
    }

    // ✅ RESET STATUS: If the list is empty, mark sync as complete
    const finalOfl = await getStorageItem(OFL_KEY) || [];
    if (finalOfl.length === 0) {
      await setStorageItem(OFL_STATUS_KEY, false);
      console.log('[OfflineSync] All pending data synced. oflinedata set to false.');
    }

  } finally {
    notifyStatusChange(false);
    console.log('[OfflineSync] Sync pass complete.');
  }
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
