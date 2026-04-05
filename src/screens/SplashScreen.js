import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const checkSession = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        const session = await AsyncStorage.getItem('userSession');

        setTimeout(() => {
          if (isLoggedIn === 'true' && session) {
            navigation.replace('Main');
          } else {
            navigation.replace('Auth');
          }
        }, 3000);
      } catch (error) {
        console.error('Session check error:', error);
        navigation.replace('Auth');
      }
    };

    checkSession();
  }, [fadeAnim, navigation]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;