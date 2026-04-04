import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Navigate to Login after 2.5 seconds
    const timer = setTimeout(() => {
      navigation.replace('Auth');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation]);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, { opacity: fadeAnim }]}>
        Journiq
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  logo: {
    fontSize: theme.fonts.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.white,
    letterSpacing: 2,
  },
});

export default SplashScreen;
