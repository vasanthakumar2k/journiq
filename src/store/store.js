import { configureStore } from '@reduxjs/toolkit';
import journalReducer from './journalSlice';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    journal: journalReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Often needed for some native modules or complex data
    }),
});
