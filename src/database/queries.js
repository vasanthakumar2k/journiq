export const getEntriesQuery = `SELECT * FROM Entries ORDER BY created_at DESC`;
export const insertEntryQuery = `INSERT INTO Entries (username, email, title, content, entry_json, date, synced) VALUES (?, ?, ?, ?, ?, ?, ?)`;
export const updateEntryQuery = `UPDATE Entries SET title = ?, content = ?, entry_json = ?, synced = ? WHERE id = ?`;
export const deleteEntryQuery = `DELETE FROM Entries WHERE id = ?`;
export const getUnsyncedEntriesQuery = `SELECT * FROM Entries WHERE synced = 0`;
export const searchEntriesQuery = `SELECT * FROM Entries WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC`;

export const queries = {
  getEntries: getEntriesQuery,
  insertEntry: insertEntryQuery,
  updateEntry: updateEntryQuery,
  deleteEntry: deleteEntryQuery,
  getUnsyncedEntries: getUnsyncedEntriesQuery,
  searchEntries: searchEntriesQuery,
};
