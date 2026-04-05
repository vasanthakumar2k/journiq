import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { deleteStory } from '../services/firestoreService';
import { Alert } from 'react-native';


const { width } = Dimensions.get('window');

const EntryDetailScreen = ({ navigation, route }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);
  const { entry } = route.params || {};

  const handleDelete = () => {
    Alert.alert(
      "Delete Journey",
      "Are you sure you want to erase this memory forever?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteStory(entry.id);
              navigation.goBack();
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', 'Could not delete the journey. Please try again.');
            }
          }
        }
      ]
    );
  };


  const renderInfoChip = (icon, label) => {
    // 🔥 FIX: Ensure the label (like the date) is a string, not a Firestore Timestamp object
    const displayLabel = 
      (label && typeof label === 'object' && label.toDate) ? label.toDate().toLocaleDateString() :
      (label && typeof label === 'object' && label._seconds) ? new Date(label._seconds * 1000).toLocaleDateString() :
      label?.toString() || 'Today';

    return (
      <View style={styles.infoChip}>
        <MaterialCommunityIcons name={icon} size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.infoChipText}>{displayLabel}</Text>
      </View>
    );
  };


  const titleParts = entry?.title?.split(' ') || ['New', 'Journey'];
  const mainTitle = titleParts.slice(0, -2).join(' ') || '';
  const highlightTitle = titleParts.slice(-2).join(' ') || '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Banner Image (First in Array) */}
        <View style={styles.imageHeader}>
          <Image 
            source={{ uri: entry?.images?.[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070' }} 
            style={styles.headerImage} 
          />
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.backButtonGlass} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButtonGlass} onPress={() => navigation.navigate('AddEntry', { entry })}>
                <MaterialCommunityIcons name="pencil-outline" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonGlass} onPress={handleDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
          {entry?.images?.length > 1 && (
            <View style={styles.paginationDots}>
              {entry.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.metaRow}>
            {renderInfoChip('calendar-range', entry?.date || 'Today')}
            {renderInfoChip('map-marker-outline', entry?.location || 'Unknown Location')}
          </View>

          {/* Styled Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleMain}>
              {mainTitle} <Text style={styles.titleHighlight}>{highlightTitle}</Text>
            </Text>
          </View>

          {/* Tags */}
          <View style={styles.tagContainer}>
            {(entry?.tags || ['Journal']).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Narrative */}
          <Text style={styles.narrative}>
            {entry?.narrative || 'No narrative provided for this journey.'}
          </Text>

          {/* Dynamic Gallery for remaining images */}
          {entry?.images?.length > 1 && (
            <View style={styles.galleryContainer}>
              <Text style={styles.galleryTitle}>Gallery</Text>
              <View style={styles.galleryGrid}>
                {entry.images.slice(1).map((img, i) => (
                  <View key={i} style={styles.galleryItem}>
                    <Image source={{ uri: img }} style={styles.galleryImage} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Interactive Map Button */}
          <TouchableOpacity style={styles.mapButtonGlass}>
            <MaterialCommunityIcons name="compass-outline" size={20} color={isDarkMode ? theme.colors.primary : theme.colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.mapButtonText}>View on Interactive Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  imageHeader: {
    height: 450,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButtonGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButtonGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 12,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFF',
    width: 20,
  },
  content: {
    paddingtop: 24,
    paddingHorizontal: 24,
    marginTop: -30,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 24,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  infoChipText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  titleContainer: {
    marginBottom: 16,
  },
  titleMain: {
    fontSize: 36,
    color: theme.colors.text,
    fontWeight: '400',
    lineHeight: 44,
  },
  titleHighlight: {
    fontWeight: '800',
    fontStyle: 'italic',
    color: theme.colors.primary,
  },
  tagContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  narrative: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 28,
    marginBottom: 32,
    opacity: 0.9,
  },
  galleryContainer: {
    marginBottom: 32,
  },
  galleryTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '800',
    marginBottom: 16,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  galleryItem: {
    width: '50%',
    padding: 6,
    height: 200,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  mapButtonGlass: {
    backgroundColor: isDarkMode ? 'rgba(123, 97, 255, 0.15)' : theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.4)',
    marginTop: 20,
    ...theme.shadows.md,
  },
  mapButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default EntryDetailScreen;
