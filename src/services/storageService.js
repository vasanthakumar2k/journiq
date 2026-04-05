import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Service
 * Provides asynchronous methods for setting, getting, and deleting values using AsyncStorage.
 * This replaces the synchronous MMKV storage for better compatibility with target environments.
 */

export const setStorageItem = async (key, value) => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`[Storage] Error setting item ${key}:`, error);
  }
};

export const getStorageItem = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    
    // Attempt to parse JSON if it looks like an object or array
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  } catch (error) {
    console.error(`[Storage] Error getting item ${key}:`, error);
    return null;
  }
};

export const deleteStorageItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Error deleting item ${key}:`, error);
  }
};

export const clearAllStorage = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('[Storage] Error clearing storage:', error);
  }
};
