import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import Card from '../components/Card';
import { getUserStories } from '../services/firestoreService';
import { getAllEntries } from '../services/journalService'; // SQLite fallback

const CATEGORIES = ['All', 'Travel', 'Work', 'Food', 'Personal', 'Ideas'];

const HomeScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);
  const [entries, setEntries] = useState([]);
  const [userName, setUserName] = useState('Explorer');
  const [dataSource, setDataSource] = useState(''); // 'firestore' | 'sqlite' | 'empty'

  useFocusEffect(
    useCallback(() => {
      // Load username from session
      AsyncStorage.getItem('userSession')
        .then(s => {
          if (s) {
            const session = JSON.parse(s);
            setUserName(session.name?.split(' ')[0] || 'Explorer');
          }
        })
        .catch(() => {});

      const fetchEntries = async () => {
        // --- Primary: Firestore ---
        try {
          const sessionStr = await AsyncStorage.getItem('userSession');
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            const userId = session.id || session.uid;
            if (userId && userId !== 'anonymous') {
              const firestoreData = await getUserStories(userId);
              // Normalize Firestore stories to Card-compatible shape
              const normalized = firestoreData.map(story => ({
                id: story.id,
                title: story.title,
                location: story.location || '',
                date: story.createdAt?.toDate?.().toLocaleDateString() || '',
                tags: story.tags || [],
                images: story.bannerImage
                  ? [story.bannerImage, ...(story.gallery || [])]
                  : story.images || [],
                narrative: story.narrative || '',
              }));
              setEntries(normalized);
              setDataSource('firestore');
              return; // success — stop here
            }
          }
        } catch (firestoreError) {
          // Firestore unavailable (offline, auth error, etc.) — fall through to SQLite
          console.warn('[Home] Firestore fetch failed, trying SQLite fallback:', firestoreError?.message);
        }

        // --- Fallback: SQLite ---
        try {
          const localData = await getAllEntries();
          setEntries(localData);
          setDataSource('sqlite');
        } catch (sqliteError) {
          console.error('[Home] SQLite fallback also failed:', sqliteError?.message);
          setEntries([]);
          setDataSource('empty');
        }
      };

      fetchEntries();
    }, [])
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.welcomeText}>Hello,</Text>
        <Text style={styles.userName}>{userName}!</Text>
      </View>
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Icon name="account" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderCategories = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryContainer}
    >
      {CATEGORIES.map((cat, index) => (
        <TouchableOpacity 
          key={cat} 
          style={[
            styles.categoryItem, 
            index === 0 ? styles.categoryItemActive : (isDarkMode ? styles.categoryItemGlass : styles.categoryItemLight)
          ]}
        >
          <Text style={[
            styles.categoryText, 
            index === 0 ? styles.categoryTextActive : (isDarkMode ? styles.categoryTextGlass : styles.categoryTextLight)
          ]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <FlatList
        data={entries}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <Text style={styles.sectionTitle}>Your Stories</Text>
            {dataSource === 'sqlite' && (
              <View style={styles.offlineBanner}>
                <Icon name="cloud-off-outline" size={14} color="#FFAA33" />
                <Text style={styles.offlineBannerText}>Showing saved stories — you're offline</Text>
              </View>
            )}
            {renderCategories()}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="book-open-outline" size={48} color={theme.colors.muted} />
            <Text style={styles.emptyStateText}>No stories yet</Text>
            <Text style={styles.emptyStateSubtext}>Tap + to capture your first journey</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <Card
              title={item.title}
              location={item.location}
              date={item.date}
              tags={item.tags}
              imageSource={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070' }}
              onPress={() => navigation.navigate('EntryDetail', { entry: item })}
            />
          </View>
        )}
        keyExtractor={item => item.id?.toString?.() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AddEntry')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: theme.fonts.sizes.xxl,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.text,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 15,
  },
  categoryScroll: {
    paddingLeft: 24,
    marginBottom: 20,
  },
  categoryContainer: {
    paddingRight: 48,
  },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
  },
  categoryItemActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  categoryItemGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryItemLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.1)',
    ...theme.shadows.sm,
  },
  categoryText: {
    fontWeight: '600',
    fontSize: theme.fonts.sizes.sm,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextGlass: {
    color: theme.colors.textSecondary,
  },
  categoryTextLight: {
    color: theme.colors.primary,
  },
  listContent: {
    paddingBottom: 100, // Extra space for tab bar
  },
  cardWrapper: {
    paddingHorizontal: 24,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 170, 51, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 51, 0.3)',
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#FFAA33',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 100, // Above the bottom tab bar
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.lg,
  },
});

export default HomeScreen;
