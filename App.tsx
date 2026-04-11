import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme/theme';
import { startSyncOnReconnect, syncPendingEntries } from './src/services/offlineSyncService';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

import SecurityOverlay from './src/components/SecurityOverlay';

const App = () => {
  useEffect(() => {
    // 0. Initialize Google Sign-In
    GoogleSignin.configure({
      webClientId: '62977450893-prnndp73i5hggs2bbnaplspq4r85me2r.apps.googleusercontent.com',
      offlineAccess: true,
    });

    // 1. Start synchronization for any existing offline data on app start
    syncPendingEntries().catch(err =>
      console.error('[App] Initial sync failed:', err)
    );

    // 2. Start listening for network reconnections to auto-sync future offline drafts
    const unsubscribeSync = startSyncOnReconnect();
    return () => {
      // Cleanup listener on unmount
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SecurityOverlay>
            <NavigationContainer>
              <StatusBar
                barStyle="light-content"
                backgroundColor={theme.colors.background}
              />
              <AppNavigator />
            </NavigationContainer>
          </SecurityOverlay>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;
