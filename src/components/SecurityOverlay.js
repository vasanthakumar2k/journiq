import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Platform, Image, StatusBar } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';

const SecurityOverlay = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const rnBiometrics = new ReactNativeBiometrics();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const checkLockStatus = async () => {
      const isEnabled = await AsyncStorage.getItem('isAppLockEnabled');
      if (isEnabled === 'true') {
        setIsLocked(true);
        setIsAuthenticated(false);
        authenticate();
      } else {
        setIsLocked(false);
        setIsAuthenticated(true);
      }
    };

    checkLockStatus();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        checkLockStatus();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const authenticate = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();

      if (available) {
        let promptMessage = 'Authenticate to unlock Journiq';
        if (biometryType === BiometryTypes.FaceID) {
          promptMessage = 'Unlock with FaceID';
        } else if (biometryType === BiometryTypes.TouchID || biometryType === BiometryTypes.Biometrics) {
          promptMessage = 'Unlock with Fingerprint';
        }

        const result = await rnBiometrics.simplePrompt({
          promptMessage: promptMessage,
        });

        if (result.success) {
          setIsAuthenticated(true);
          setIsLocked(false);
        } else {
          // User cancelled or failed
          setIsAuthenticated(false);
        }
      } else {
        // Biometrics not available on this device or not set up
        // Usually we'd fallback to a PIN, but since we don't have a custom PIN system yet, 
        // we'll allow access if biometrics aren't available despite the toggle being on.
        console.warn('Biometrics not available for this device.');
        setIsAuthenticated(true);
        setIsLocked(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Fail safe: allow if it crashes? Or stay locked?
      // For now, allow if it's a technical error to prevent lockouts.
      setIsAuthenticated(true);
      setIsLocked(false);
    }
  };

  if (isLocked && !isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.glassCard}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-outline" size={60} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Journiq Secured</Text>
          <Text style={styles.subtitle}>Authentication required to access your memories.</Text>
          
          <TouchableOpacity style={styles.unlockButton} onPress={authenticate}>
            <MaterialCommunityIcons name="fingerprint" size={24} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.unlockText}>Unlock Now</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>YOUR JOURNEY IS PROTECTED</Text>
        </View>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E', // Dark aesthetic background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  glassCard: {
    width: '100%',
    padding: 40,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(123, 97, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  unlockText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default SecurityOverlay;
