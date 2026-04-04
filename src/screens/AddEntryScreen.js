import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, StatusBar, ActivityIndicator, Alert, PermissionsAndroid, Platform, Modal } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { uploadToS3 } from '../services/s3Service';
import { addStory } from '../services/firestoreService';
import { isOnline, saveOffline } from '../services/offlineSyncService';
import Geolocation from 'react-native-geolocation-service';
import { requestMediaLibraryPermission, requestLocationPermission } from '../utils/permissionHelper';
import { generateInsights } from '../services/aiService';

const AddEntryScreen = ({ navigation, route }) => {
  const { entry } = route.params || {};
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);
  
  const [title, setTitle] = useState(entry?.title || '');
  const [narrative, setNarrative] = useState(entry?.narrative || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onPress: null });
  
  // Initialize with empty array for a clean start or use entry images
  const [images, setImages] = useState(entry?.images?.map((uri, index) => ({
    id: `img-${Date.now()}-${index}`,
    uri: uri,
    isS3: uri.startsWith('http'),
  })) || []);
  const [tags, setTags] = useState(entry?.tags || ['Exploring', 'Adventure']);
  const [location, setLocation] = useState(entry?.location || 'Fetching location...');
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setLocation('Location permission denied');
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, you'd use reverse geocoding here. 
        // For now, we'll show coordinates or a fallback.
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        // Optional: Use a free reverse geocoding API if possible, or just stay with coords
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              const address = data.address;
              const city = address.city || address.town || address.village || '';
              const country = address.country || '';
              setLocation(`${city}${city && country ? ', ' : ''}${country}` || 'Unknown Location');
            }
          })
          .catch(() => console.log('Reverse geocoding failed'));
      },
      (error) => {
        console.warn(error);
        setLocation('Bali, Indonesia'); // Fallback
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Handle AI tagging
  const updateInsights = () => {
    const newTags = generateInsights(title, narrative);
    if (newTags.length > 0) {
      setTags(newTags);
    }
  };

  const showAlert = (title, message, type = 'info', onPress = null) => {
    setAlertConfig({ visible: true, title, message, type, onPress });
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [];
        
        if (Platform.Version >= 33) {
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        } else {
          permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
        permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);

        const grants = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = permissions.every(p => grants[p] === PermissionsAndroid.RESULTS.GRANTED);

        if (allGranted) {
          console.log('Permissions granted');
          return true;
        } else {
          showAlert('Permissions Required', 'We need access to your photos to add them to your journey.', 'warning');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermission();

    if (!hasPermission) {
      showAlert(
        'Permission Denied',
        'Please allow access to your photo library in Settings to add your memories.',
        'warning'
      );
      return;
    }

    launchGallery();
  };

  const launchGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.didCancel) {
      console.log('User cancelled image picker');
    } else if (result.errorCode) {
      showAlert('Error', result.errorMessage || 'Something went wrong while picking the image.', 'error');
    } else if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      handleUpload(asset);
    }
  };

  const handleUpload = async (asset) => {
    setIsUploading(true);

    // Immediately show a local preview — always, regardless of network
    const localImage = {
      id: `local-${Date.now()}`,
      uri: asset.uri,
      base64: asset.base64 || null, // Store for later S3 upload if offline
      isUploading: true,
      isS3: false,
    };
    setImages(prev => [...prev, localImage]);

    try {
      const online = await isOnline();

      if (!online) {
        // OFFLINE: Keep image as local URI — no S3 push
        console.log('[AddEntry] Offline: storing image locally, skipping S3.');
        setImages(prev => prev.map(img =>
          img.id === localImage.id
            ? { ...img, isUploading: false, isOffline: true }
            : img
        ));
        return;
      }

      // ONLINE: Upload to S3 now
      console.log('[AddEntry] Online: uploading image to S3...');
      const s3Url = await uploadToS3(
        asset.uri,
        asset.fileName || `entry_${Date.now()}.jpg`,
        asset.type || 'image/jpeg',
        asset.base64,
      );

      console.log('[AddEntry] S3 URL:', s3Url);
      setImages(prev => prev.map(img =>
        img.id === localImage.id
          ? { ...img, uri: s3Url, isS3: true, isUploading: false, base64: null }
          : img
      ));
    } catch (error) {
      console.error('[AddEntry] Upload failed:', error?.message || error);
      // Keep the local image but mark upload failed — never crash
      setImages(prev => prev.map(img =>
        img.id === localImage.id
          ? { ...img, isUploading: false, uploadFailed: true }
          : img
      ));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Missing Title', 'Please give your journey a title.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Get user session
      const sessionStr = await AsyncStorage.getItem('userSession');
      const user = sessionStr
        ? JSON.parse(sessionStr)
        : { id: 'anonymous', name: 'Anonymous User', email: 'anon@journiq.com' };

      // 2. Build story payload — include base64 for offline images
      const storyData = {
        title,
        narrative,
        location,
        tags,
        images: images.map(img => ({
          uri: img.uri,
          base64: img.base64 || null,
          isS3: img.isS3 || false,
        })),
      };

      // 3. Check connectivity
      const online = await isOnline();

      if (!online) {
        // OFFLINE: save to SQLite, no S3 push
        await saveOffline(storyData, user);
        showAlert(
          'Saved Offline',
          'No internet connection. Your journey was saved locally and will sync automatically when you come back online.',
          'info',
        );
      } else {
        // ONLINE: push images (if any still local) then save to Firestore
        const uploadedImages = [];
        for (const img of storyData.images) {
          if (img.isS3) {
            // Already on S3
            uploadedImages.push(img.uri);
          } else {
            try {
              const s3Url = await uploadToS3(
                img.uri,
                `entry_${Date.now()}.jpg`,
                'image/jpeg',
                img.base64,
              );
              uploadedImages.push(s3Url);
            } catch (uploadErr) {
              console.warn('[AddEntry] Could not upload image to S3:', uploadErr?.message);
              uploadedImages.push(img.uri); // fallback: keep local URI
            }
          }
        }

        const storyId = await addStory(user.id, {
          ...storyData,
          images: uploadedImages,
        });

        console.log('[AddEntry] Story saved to Firestore:', storyId);
        showAlert('Success', 'Your journey has been captured and synced to Firestore! ☁️', 'success');
      }

      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      // Never crash — always show a friendly error
      console.error('[AddEntry] Save failed:', error?.message || error);
      showAlert('Save Failed', 'Something went wrong while saving. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const renderMediaItem = ({ item, drag, isActive, index }) => (
    <ScaleDecorator>
      <TouchableOpacity 
        onLongPress={drag}
        disabled={isActive}
        style={[
          styles.mediaCard,
          isActive && { opacity: 0.8, transform: [{ scale: 1.05 }] }
        ]}
      >
        <Image source={{ uri: item.uri }} style={styles.mediaImage} />
        {item.isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color="#FFF" size="large" />
          </View>
        )}
        <TouchableOpacity 
          style={styles.removeMediaButton} 
          onPress={() => removeImage(item.id)}
        >
          <MaterialCommunityIcons name="delete-outline" size={16} color="#FFF" />
        </TouchableOpacity>
        {index === 0 && (
          <View style={styles.bannerBadgeBottom}>
            <MaterialCommunityIcons name="star" size={12} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.bannerBadgeText}>BANNER IMAGE</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScaleDecorator>
  );

  const renderAddButton = () => (
    <TouchableOpacity 
      style={styles.addMediaCardSmall} 
      onPress={pickImage}
      disabled={isUploading}
    >
      {isUploading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <>
          <MaterialCommunityIcons name="camera-plus-outline" size={32} color={theme.colors.primary} />
          <Text style={styles.addPhotoIconLabel}>Add Photo</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertConfig.visible}
        animationType="fade"
        onRequestClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: alertConfig.type === 'success' ? 'rgba(80, 227, 194, 0.2)' : alertConfig.type === 'error' ? 'rgba(255, 97, 171, 0.2)' : 'rgba(123, 97, 255, 0.2)' }]}>
              <MaterialCommunityIcons 
                name={alertConfig.type === 'success' ? 'check-circle' : alertConfig.type === 'error' ? 'alert-circle' : 'information'} 
                size={40} 
                color={alertConfig.type === 'success' ? '#50E3C2' : alertConfig.type === 'error' ? '#FF61AB' : '#7B61FF'} 
              />
            </View>
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalMessage}>{alertConfig.message}</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setAlertConfig({ ...alertConfig, visible: false });
                if (alertConfig.onPress) alertConfig.onPress();
              }}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{entry ? 'Edit Journal Entry' : 'New Journal Entry'}</Text>
        <Text style={styles.brandTitle}>Journiq</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Visual Memories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visual Memories</Text>
            <Text style={styles.sectionLimit}>DRAG TO REORDER • FIRST IS BANNER</Text>
          </View>
          
          <View style={styles.draggableContainer}>
            <DraggableFlatList
              data={images}
              onDragEnd={({ data }) => setImages(data)}
              keyExtractor={(item) => item.id}
              renderItem={renderMediaItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              containerStyle={styles.mediaScroll}
              ListFooterComponent={renderAddButton}
              ListFooterComponentStyle={styles.mediaFooter}
            />
          </View>
        </View>

        {/* Journey Title */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>JOURNEY TITLE</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Where did your soul wander today?"
            placeholderTextColor={theme.colors.muted}
            value={title}
            onChangeText={setTitle}
            multiline
          />
        </View>

        {/* Location Bar */}
        <TouchableOpacity 
          style={styles.locationBar} 
          onPress={() => setIsEditingLocation(true)}
          activeOpacity={0.7}
        >
          <View style={styles.locationIconContainer}>
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
            {isEditingLocation ? (
              <TextInput
                style={styles.locationInput}
                value={location}
                onChangeText={setLocation}
                onBlur={() => setIsEditingLocation(false)}
                autoFocus
              />
            ) : (
              <Text style={styles.locationValue} numberOfLines={1}>{location}</Text>
            )}
          </View>
          <TouchableOpacity onPress={fetchLocation}>
            <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* The Narrative */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>THE NARRATIVE</Text>
          <View style={styles.narrativeContainer}>
            <TextInput
              style={styles.narrativeInput}
              placeholder="The scent of salt air, the warmth of the sun, the feeling of discovery..."
              placeholderTextColor={theme.colors.muted}
              value={narrative}
              onChangeText={setNarrative}
              onBlur={updateInsights}
              multiline
            />
          </View>
        </View>

        {/* AI Insights */}
        <View style={styles.section}>
          <View style={styles.aiHeader}>
            <MaterialCommunityIcons name="auto-fix" size={18} color={theme.colors.primary} />
            <Text style={styles.aiTitle}>AI Insights</Text>
            <TouchableOpacity onPress={updateInsights} style={styles.refreshAi}>
              <MaterialCommunityIcons name="refresh" size={14} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
            {tags.map((tag, i) => (
              <View key={i} style={[styles.aiTag, { backgroundColor: i === 0 ? 'rgba(123, 97, 255, 0.2)' : i === 1 ? 'rgba(80, 227, 194, 0.2)' : 'rgba(255, 97, 171, 0.2)' }]}>
                <View style={[styles.tagDot, { backgroundColor: i === 0 ? '#7B61FF' : i === 1 ? '#50E3C2' : '#FF61AB' }]} />
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.addTagButton}>
              <Text style={styles.addTagText}>+ Add Tag</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.timeButton}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButtonGlass, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Journey</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  brandTitle: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  scrollView: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '800',
  },
  sectionLimit: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: '700',
  },
  draggableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaScroll: {
    flexGrow: 0,
  },
  mediaCard: {
    width: 200,
    height: 280,
    borderRadius: 30,
    marginRight: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surface,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bannerBadgeBottom: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(123, 97, 255, 0.85)',
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bannerBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  addMediaCardSmall: {
    width: 200,
    height: 280,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
  },
  addPhotoIconLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: 8,
  },
  mediaFooter: {
    marginLeft: 0,
    marginRight: 24,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    color: theme.colors.text,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 1,
  },
  titleInput: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: '600',
    padding: 0,
    lineHeight: 32,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 32,
    ...theme.shadows.sm,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 8,
    color: theme.colors.muted,
    fontWeight: '800',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
  },
  locationInput: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
    padding: 0,
  },
  narrativeContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    minHeight: 180,
    ...theme.shadows.sm,
  },
  narrativeInput: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 24,
    padding: 0,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '800',
    marginLeft: 8,
    flex: 1,
  },
  refreshAi: {
    padding: 4,
    opacity: 0.6,
  },
  tagScroll: {
    flexDirection: 'row',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
  },
  addTagButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  addTagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surfaceDark,
    paddingBottom: 40,
  },
  timeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...theme.shadows.sm,
  },
  saveButtonGlass: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.lg,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default AddEntryScreen;
