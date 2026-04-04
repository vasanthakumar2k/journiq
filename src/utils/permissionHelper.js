import { Platform, PermissionsAndroid } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

/**
 * Requests photo library permissions based on the platform and version.
 * Follows the recommended pattern for React Native CLI projects.
 * @returns {Promise<boolean>} - True if permission is granted or limited.
 */
export const requestMediaLibraryPermission = async () => {
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
    return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
  }

  if (Platform.OS === 'android') {
    // For Android 13+ (API 33+)
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    // For older Android (API 32 and below)
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
};

/**
 * Requests location permissions based on the platform.
 * @returns {Promise<boolean>} - True if permission is granted.
 */
export const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
    }

    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'Location Permission',
                message: 'Journiq needs access to your location to automatically tag your journeys.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
};
