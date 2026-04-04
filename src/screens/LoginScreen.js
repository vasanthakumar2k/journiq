import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';

const LoginScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '62977450893-prnndp73i5hggs2bbnaplspq4r85me2r.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const user = response.data.user;
      
      // 🔥 NEW: Store/Update user in Firestore (Best Practice: Use Google UID)
      const { createUser } = require('../services/firestoreService');
      await createUser(user);

      // Store in AsyncStorage for session management
      await AsyncStorage.setItem('userSession', JSON.stringify({
        name: user.name,
        email: user.email,
        photo: user.photo,
        id: user.id
      }));

      // Navigate to Home
      navigation.replace('Main');
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
      } else {
        setError('Authentication failed. Please try again.');
        console.error(error);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Dynamic Aesthetic Background */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
        <View style={[styles.glowCircle, styles.glow1]} />
        <View style={[styles.glowCircle, styles.glow2]} />
      </View>

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlass}>
            <MaterialCommunityIcons name="feather" size={50} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Journiq</Text>
          <Text style={styles.subtitle}>Your journey, curated.</Text>
        </View>

        {/* Action Section */}
        <View style={styles.actionContainer}>
          <View style={styles.glassCard}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.instructionText}>Continue your story where you left off.</Text>
            
            <TouchableOpacity 
              style={[styles.googleButton, isAuthenticating && { opacity: 0.8 }]} 
              onPress={handleGoogleLogin}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons name="google" size={24} color="#FFF" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#FF61AB" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to the journey? </Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Create account</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.legalLinks}>
          <Text style={styles.legalText}>PRIVACY POLICY</Text>
          <View style={styles.legalDot} />
          <Text style={styles.legalText}>TERMS OF SERVICE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1A1A2E',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#0F0F1E',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 999,
    filter: Platform.OS === 'ios' ? 'blur(80px)' : undefined, // Native blur not supported on Android without package
    opacity: 0.15,
  },
  glow1: {
    width: 300,
    height: 300,
    backgroundColor: '#7B61FF',
    top: -50,
    right: -50,
  },
  glow2: {
    width: 250,
    height: 250,
    backgroundColor: '#50E3C2',
    bottom: 50,
    left: -50,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 100,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoGlass: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    fontWeight: '500',
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 40,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  googleButton: {
    backgroundColor: '#4E96FF',
    width: '100%',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4E96FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255, 97, 171, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  errorText: {
    color: '#FF61AB',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  linkText: {
    color: '#4E96FF',
    fontSize: 14,
    fontWeight: '700',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  legalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 15,
  },
});

export default LoginScreen;
