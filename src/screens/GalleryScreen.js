import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, ActivityIndicator, Dimensions, Modal, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { getUserStories } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width } = Dimensions.get('window');
const GRID_SPACING = 12;
const COLUMN_WIDTH = (width - 48 - (GRID_SPACING * 2)) / 3;

const GalleryScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDarkMode), [theme, isDarkMode]);
  
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Viewer state
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeStory, setActiveStory] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessionStr = await AsyncStorage.getItem('userSession');
      if (!sessionStr) {
        setIsLoading(false);
        return;
      }
      const user = JSON.parse(sessionStr);
      const fetchedStories = await getUserStories(user.email);
      setStories(fetchedStories);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleImagePress = (uri, story) => {
    setSelectedImage(uri);
    setActiveStory(story);
  };

  const closeViewer = () => {
    setSelectedImage(null);
    setActiveStory(null);
  };

  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      const result = await request(
        Platform.OS === 'android' && Platform.Version >= 33 
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES 
          : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
      );
      return result === RESULTS.GRANTED;
    }
    return true;
  };

  const downloadImage = async (uri) => {
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "We need access to your gallery to save photos.");
      return;
    }

    try {
      setIsDownloading(true);
      const res = await ReactNativeBlobUtil.config({
        fileCache: true,
        appendExt: 'jpg',
      }).fetch('GET', uri);
      
      await CameraRoll.save(res.path(), { type: 'photo' });
      Alert.alert("Success", "Memory saved to your device gallery! 📸");
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert("Error", "Failed to download image. Please check your connection.");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderStorySection = ({ item: story }) => {
    const storyImages = story.images || [story.bannerImage, ...(story.gallery || [])].filter(Boolean);
    
    if (storyImages.length === 0) return null;

    return (
      <View style={styles.storySection}>
        <View style={styles.storyHeader}>
          <View style={styles.titleLine} />
          <Text style={styles.storyTitle}>{story.title}</Text>
        </View>
        
        <View style={styles.imageGrid}>
          {storyImages.map((uri, index) => (
            <TouchableOpacity 
              key={`${story.id}-${index}`}
              style={styles.gridImageWrapper} 
              activeOpacity={0.8}
              onPress={() => handleImagePress(uri, story)}
            >
              <Image source={{ uri }} style={styles.gridImage} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Personal</Text>
          <Text style={styles.headerTitle}>Gallery</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
          <MaterialCommunityIcons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your storybook...</Text>
        </View>
      ) : stories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="image-off-outline" size={64} color={theme.colors.muted} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySubtitle}>Capture some memories to see them here.</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={renderStorySection}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent animationType="slide" onRequestClose={closeViewer}>
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeViewer} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalStoryTitle} numberOfLines={1}>{activeStory?.title}</Text>
              <Text style={styles.modalStoryLocation}>{activeStory?.location}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => downloadImage(selectedImage)} 
              disabled={isDownloading}
              style={styles.downloadButton}
            >
              {isDownloading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <MaterialCommunityIcons name="download" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bigImageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.bigImage} resizeMode="contain" />
          </View>

          <View style={styles.otherImagesSection}>
            <Text style={styles.otherImagesTitle}>OTHER MEMORIES FROM THIS JOURNEY</Text>
            <FlatList
              horizontal
              data={(activeStory?.images || [activeStory?.bannerImage, ...(activeStory?.gallery || [])].filter(Boolean))}
              keyExtractor={(item, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: uri }) => (
                <TouchableOpacity 
                  onPress={() => setSelectedImage(uri)}
                  style={[styles.miniThumbWrapper, selectedImage === uri && styles.miniThumbActive]}
                >
                  <Image source={{ uri }} style={styles.miniThumb} />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  listContent: {
    paddingBottom: 100,
  },
  storySection: {
    marginBottom: 32,
  },
  storyHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleLine: {
    width: 24,
    height: 3,
    backgroundColor: theme.colors.primary,
    marginBottom: 8,
    borderRadius: 2,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  storyDate: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  gridImageWrapper: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    borderRadius: 16,
    margin: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderText: {
    flex: 1,
    paddingHorizontal: 12,
  },
  modalStoryTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalStoryLocation: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigImage: {
    width: width,
    height: width * 1.5,
  },
  otherImagesSection: {
    paddingBottom: 60,
  },
  otherImagesTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  miniThumbWrapper: {
    width: 70,
    height: 90,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  miniThumbActive: {
    borderColor: theme.colors.primary,
  },
  miniThumb: {
    width: '100%',
    height: '100%',
  },
});

export default GalleryScreen;
