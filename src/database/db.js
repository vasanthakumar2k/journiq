import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const database_name = "Journiq.db";
const database_version = "1.0";
const database_displayname = "Journiq Database";
const database_size = 200000;

export const getDBConnection = async () => {
  return SQLite.openDatabase(
    database_name,
    database_version,
    database_displayname,
    database_size
  );
};

export const initDatabase = async () => {
  const db = await getDBConnection();
  // Using entry_json to store the full object structure as requested
  const query = `CREATE TABLE IF NOT EXISTS Entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT,
        title TEXT,
        content TEXT,
        entry_json TEXT,
        date TEXT,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;
  await db.executeSql(query);
};
