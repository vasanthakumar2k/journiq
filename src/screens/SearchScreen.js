import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, StatusBar, ScrollView, ImageBackground } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { getAllStories } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';



const SearchScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [userPhoto, setUserPhoto] = useState('https://i.pravatar.cc/100');

  useEffect(() => {
    AsyncStorage.getItem('userSession').then(s => {
      if (s) {
        const session = JSON.parse(s);
        if (session.photo) setUserPhoto(session.photo);
      }
    });
  }, []);

  const handleSearch = useCallback(async (query) => {
    try {
      const sessionStr = await AsyncStorage.getItem('userSession');
      if (!sessionStr) return;
      
      const firestoreData = await getAllStories();

      
      // Local filtering for the query
      const filtered = firestoreData.filter(item => 
        item.title?.toLowerCase().includes(query.toLowerCase()) ||
        item.location?.toLowerCase().includes(query.toLowerCase()) ||
        item.narrative?.toLowerCase().includes(query.toLowerCase())
      );

      const formatted = filtered.map(story => {
        const storyImages = story.images || [story.bannerImage, ...(story.gallery || [])].filter(Boolean);

        return {
          id: story.id,
          title: story.title,
          location: story.location || '',
          date: story.createdAt?.toDate?.().toLocaleDateString() || (story.createdAt ? new Date(story.createdAt).toLocaleDateString() : 'Today'),
          tags: story.tags || [],
          images: storyImages,
          image: storyImages[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070',
          narrative: story.narrative || '',
          type: 'standard',
          tag: story.tags?.[0] || 'JOURNAL',
          stats: { views: Math.floor(Math.random() * 100), comments: Math.floor(Math.random() * 10) }
        };
      });


      setResults(formatted);
    } catch (error) {
      console.error("Search error:", error);
    }
  }, []);


  useFocusEffect(
    useCallback(() => {
      handleSearch(searchQuery);
    }, [searchQuery, handleSearch])
  );

  const filters = [
    { id: '1', label: 'All Filters', icon: 'tune-variant', active: true },
    { id: '2', label: 'Trips', active: false },
    { id: '3', label: 'Latest', icon: 'calendar-outline', active: false },
  ];

  const renderFilterItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.filterChip, 
        item.active ? styles.filterChipActive : (isDarkMode ? styles.filterChipGlass : styles.filterChipLight),
      ]}
    >
      {item.icon && <MaterialCommunityIcons name={item.icon} size={16} color={item.active ? "#FFF" : theme.colors.muted} style={{ marginRight: 6 }} />}
      <Text style={[styles.filterText, item.active && styles.filterTextActive]}>{item.label}</Text>
      {item.removable && <MaterialCommunityIcons name="close" size={14} color={theme.colors.muted} style={{ marginLeft: 6 }} />}
    </TouchableOpacity>
  );

  const renderResultItem = ({ item, index }) => {
    switch (item.type) {
      case 'hero':
        return (
          <TouchableOpacity style={styles.heroCard} activeOpacity={0.9} onPress={() => navigation.navigate('EntryDetail', { entry: item })}>
            <ImageBackground source={{ uri: item.image }} style={styles.heroBg} imageStyle={{ borderRadius: 30 }}>
              <View style={styles.heroOverlay}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroTitle}>{item.title}</Text>
                  <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.heroFooter}>
                  <Text style={styles.heroDate}>{item.date}</Text>
                  {item.isLiked && <MaterialCommunityIcons name="heart" size={20} color={theme.colors.secondary} />}
                </View>
                <Text style={styles.heroLocation}>{item.location}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        );

      case 'standard':
        return (
          <TouchableOpacity style={styles.standardCard} activeOpacity={0.9} onPress={() => navigation.navigate('EntryDetail', { entry: item })}>
            <Image source={{ uri: item.image }} style={styles.standardImage} />
            <View style={styles.standardContent}>
              <Text style={styles.standardTag}>{item.tag}</Text>
              <Text style={styles.standardTitle}>{item.title}</Text>
              <View style={styles.standardMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="eye-outline" size={12} color={theme.colors.muted} />
                  <Text style={styles.metaText}>{item.stats.views}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="comment-outline" size={12} color={theme.colors.muted} />
                  <Text style={styles.metaText}>{item.stats.comments} min read</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 24 }} /> 
        <Text style={styles.headerTitle}>Journiq</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search memories, locations, or dates..."
                  placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
              {filters.map((f) => (
                <View key={f.id}>{renderFilterItem({ item: f })}</View>
              ))}
            </ScrollView>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              <Text style={styles.resultsCount}>({results.length} journals found)</Text>
            </View>
          </>
        }
        renderItem={renderResultItem}
      />
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 60,
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  searchInput: {
    fontSize: 14,
    color: theme.colors.text,
  },
  filterScroll: {
    marginBottom: 24,
    paddingLeft: 20,
  },
  filterContainer: {
    paddingRight: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  filterChipGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.1)',
    ...theme.shadows.sm,
  },
  filterText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '800',
    marginRight: 8,
  },
  resultsCount: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  // Card Variant: Hero
  heroCard: {
    marginHorizontal: 20,
    height: 240,
    marginBottom: 24,
    ...theme.shadows.md,
  },
  heroBg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    padding: 24,
    justifyContent: 'space-between',
  },
  heroHeader: {
    maxWidth: '80%',
  },
  heroTitle: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
    lineHeight: 18,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroDate: {
    fontSize: 11,
    color: '#FFF',
    opacity: 0.6,
  },
  heroLocation: {
    position: 'absolute',
    bottom: -15,
    right: 20,
    fontSize: 50,
    color: '#FFF',
    opacity: 0.1,
    letterSpacing: 4,
    fontWeight: '900',
    zIndex: -1,
  },
  // Card Variant: Standard
  standardCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 30,
    marginBottom: 24,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  standardImage: {
    width: '100%',
    height: 180,
  },
  standardContent: {
    padding: 20,
  },
  standardTag: {
    fontSize: 10,
    color: theme.colors.secondary,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  standardTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '800',
    marginBottom: 12,
  },
  standardMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.muted,
    marginLeft: 4,
    fontWeight: '600',
  },
  // Card Variant: Itinerary
  itineraryCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 30,
    padding: 20,
    flexDirection: 'row',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  itineraryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itineraryContent: {
    flex: 1,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itineraryTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '800',
  },
  itinerarySubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  extraBadge: {
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraText: {
    fontSize: 8,
    color: theme.colors.textSecondary,
    fontWeight: '800',
  },
  // Card Variant: Action
  actionCard: {
    marginHorizontal: 20,
    height: 300,
    marginBottom: 120,
    ...theme.shadows.md,
  },
  actionBg: {
    width: '100%',
    height: '100%',
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 30,
    padding: 30,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  ctaWrapper: {
    marginTop: 10,
  },
  ctaButtonGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.md,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default SearchScreen;
