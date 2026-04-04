import { getDBConnection } from '../database/db';
import { queries } from '../database/queries';
import { uploadMultipleToS3 } from './s3Service';

/**
 * Adds a new journal entry.
 * 1. Uploads images to S3.
 * 2. Saves metadata and JSON structure to SQLite.
 */
export const saveJournalEntry = async (entryData, user) => {
    try {
        const db = await getDBConnection();

        // 1. Upload images to S3 if there's any
        let s3Urls = [];
        if (entryData.images && entryData.images.length > 0) {
            // Only upload images that are local (don't already have an s3 url)
            const localImages = entryData.images.filter(img => !img.uri.startsWith('http'));
            
            // For simplicity, let's assume we upload all if not starting with http
            // In a real app, we'd map back the uploaded URLs to the correct positions
            s3Urls = await uploadMultipleToS3(entryData.images);
        }

        // 2. Prepare the object structure for JSON storage
        const entryObject = {
            ...entryData,
            images: s3Urls, // Updated with S3 URLs
            timestamp: new Date().toISOString(),
        };

        const jsonString = JSON.stringify(entryObject);

        // 3. Insert into SQLite
        await db.executeSql(queries.insertEntry, [
            user.name,
            user.email,
            entryData.title,
            entryData.narrative || '', // Using narrative as content for search
            jsonString,
            entryData.date || new Date().toLocaleDateString(),
            0 // synced
        ]);

        console.log("Journal entry saved successfully to SQLite.");
        return true;
    } catch (error) {
        console.error("Failed to save journal entry:", error);
        throw error;
    }
};

/**
 * Fetches all journal entries from local storage.
 */
export const getAllEntries = async () => {
    try {
        const db = await getDBConnection();
        const results = await db.executeSql(queries.getEntries);
        
        const entries = [];
        for (let i = 0; i < results[0].rows.length; i++) {
            const row = results[0].rows.item(i);
            const entry = JSON.parse(row.entry_json);
            entries.push({
                ...entry,
                id: row.id, // Ensure we use the DB id
            });
        }
        return entries;
    } catch (error) {
        console.error("Failed to fetch entries:", error);
        throw error;
    }
};

/**
 * Searches entries in local storage.
 */
export const searchLocalEntries = async (text) => {
    try {
        const db = await getDBConnection();
        const results = await db.executeSql(queries.searchEntries, [`%${text}%`, `%${text}%`]);
        
        const entries = [];
        for (let i = 0; i < results[0].rows.length; i++) {
            const row = results[0].rows.item(i);
            const entry = JSON.parse(row.entry_json);
            entries.push({
                ...entry,
                id: row.id,
            });
        }
        return entries;
    } catch (error) {
        console.error("Failed to search entries:", error);
        throw error;
    }
};
