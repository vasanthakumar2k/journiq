import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Modal, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, StatusBar, ScrollView, ImageBackground, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/useTheme';
import { getAllStories } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SearchScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [userPhoto, setUserPhoto] = useState('https://i.pravatar.cc/100');

  // Filtering states
  const [activeFilter, setActiveFilter] = useState('All');
  const [showTagModal, setShowTagModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

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
      console.log('[Search] Raw Data Sample:', firestoreData[0]); // Logging for structure verification
      setAllEntries(firestoreData);

      // 🔍 Step 1: Text Search (Title, Location, Narrative)
      const searchTerms = query.toLowerCase();
      let filteredByText = firestoreData.filter(item => {
        const title = (item.title || '').toLowerCase();
        const location = (item.location || '').toLowerCase();
        const narrative = (item.narrative || '').toLowerCase();

        return title.includes(searchTerms) ||
          location.includes(searchTerms) ||
          narrative.includes(searchTerms);
      });

      // 🏷️ Step 2: Extract Contextual Tags
      const tags = new Set();
      filteredByText.forEach(item => {
        if (Array.isArray(item.tags)) {
          item.tags.forEach(t => tags.add(t));
        }
      });
      setAvailableTags(Array.from(tags).sort());

      // 🕒 Step 3: Combined Filtering (AND Logic)
      let filtered = filteredByText;

      // Filter by Selected Tag
      if (selectedTag) {
        filtered = filtered.filter(item =>
          Array.isArray(item.tags) && item.tags.includes(selectedTag)
        );
      }

      // Filter by Selected Date (Firestore Timestamp Comparison)
      if (selectedDate) {
        const targetDateString = selectedDate.toDateString();
        filtered = filtered.filter(item => {
          if (item.createdAt && item.createdAt.seconds) {
            const itemTime = new Date(item.createdAt.seconds * 1000);
            return itemTime.toDateString() === targetDateString;
          }
          return false;
        });
      }

      const formatted = filtered.map(story => {
        const storyImages = story.images || [story.bannerImage, ...(story.gallery || [])].filter(Boolean);

        return {
          id: story.id,
          title: story.title,
          location: story.location || '',
          date: story.createdAt?.seconds
            ? new Date(story.createdAt.seconds * 1000).toLocaleDateString()
            : 'Today',
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
  }, [selectedTag, selectedDate]);


  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, selectedTag, selectedDate, handleSearch]);

  useFocusEffect(
    useCallback(() => {
      // Re-fetch everything on focus to ensure data is fresh
      handleSearch(searchQuery);
    }, [searchQuery, handleSearch])
  );

  const filters = [
    { id: 'all', label: 'All Filters', icon: 'tune-variant', active: !selectedTag && !selectedDate },
    { id: 'tags', label: selectedTag || 'Tags', icon: 'tag-outline', active: !!selectedTag },
    { id: 'latest', label: selectedDate ? selectedDate.toLocaleDateString() : 'Latest', icon: 'calendar-outline', active: !!selectedDate },
  ];

  const handleFilterPress = (filterId) => {
    if (filterId === 'all') {
      setSelectedTag(null);
      setSelectedDate(null);
    } else if (filterId === 'tags') {
      setShowTagModal(true);
    } else if (filterId === 'latest') {
      setShowDateModal(true);
    }
  };

  const renderFilterItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleFilterPress(item.id)}
      style={[
        styles.filterChip,
        item.active ? styles.filterChipActive : (isDarkMode ? styles.filterChipGlass : styles.filterChipLight),
      ]}
    >
      {item.icon && <MaterialCommunityIcons name={item.icon} size={16} color={item.active ? "#FFF" : theme.colors.muted} style={{ marginRight: 6 }} />}
      <Text style={[styles.filterText, item.active && styles.filterTextActive]}>{item.label}</Text>
      {item.active && item.id !== 'all' && (
        <TouchableOpacity onPress={() => item.id === 'tags' ? setSelectedTag(null) : setSelectedDate(null)}>
          <MaterialCommunityIcons name="close" size={14} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}
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

      {/* Tag Modal */}
      <Modal visible={showTagModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Tag</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal={false} contentContainerStyle={styles.tagGrid}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagPopupItem, selectedTag === tag && styles.tagPopupItemActive]}
                  onPress={() => {
                    setSelectedTag(tag);
                    setShowTagModal(false);
                  }}
                >
                  <Text style={[styles.tagPopupText, selectedTag === tag && styles.tagPopupTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Modal (Visual Calendar Grid) */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date</Text>
                <Text style={styles.modalSubtitle}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDateModal(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              <View style={styles.weekDaysRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={`${d}-${i}`} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {(() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  const days = [];

                  // Empty slots for days before the 1st
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
                  }

                  // Actual days
                  for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(now.getFullYear(), now.getMonth(), d);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();

                    days.push(
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.calendarDayCell,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday
                        ]}
                        onPress={() => {
                          setSelectedDate(date);
                          setShowDateModal(false);
                        }}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                          isToday && !isSelected && styles.calendarDayTextToday
                        ]}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return days;
                })()}
              </View>
            </View>

            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => {
                setSelectedDate(null);
                setShowDateModal(false);
              }}
            >
              <Text style={styles.clearDateText}>Clear Selection</Text>
            </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '70%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagPopupItem: {
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
  },
  tagPopupItemActive: {
    backgroundColor: theme.colors.primary,
  },
  tagPopupText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  tagPopupTextActive: {
    color: '#FFF',
  },
  datePickerPlaceholder: {
    paddingVertical: 20,
  },
  dateInfo: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  calendarContainer: {
    marginTop: 10,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  weekDayText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '800',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDayCell: {
    width: (width - 48 - 48) / 7, // Adjusting for modal padding
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    ...theme.shadows.sm,
  },
  calendarDayToday: {
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    borderRadius: 12,
  },
  calendarDayText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  calendarDayTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  clearDateButton: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  clearDateText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SearchScreen;