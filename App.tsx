import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme/theme';
import { startSyncOnReconnect } from './src/services/offlineSyncService';

const App = () => {
  useEffect(() => {
    // Start listening for network reconnections to auto-sync offline drafts
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
          <NavigationContainer>
            <StatusBar
              barStyle="light-content"
              backgroundColor={theme.colors.background}
            />
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;
