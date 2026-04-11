import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, StatusBar, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { getUserStories } from '../services/firestoreService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


const ProfileScreen = () => {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme, isDarkMode);

  const [user, setUser] = useState({
    name: 'Julian Thorne',
    email: 'julian@thorne.com',
    photo: 'https://i.pravatar.cc/300'
  });

  const [stats, setStats] = useState({ trips: '0', entries: '0' });
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);

  useEffect(() => {
    loadUserSession();
    loadStats();
    loadSecuritySettings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserSession();
    }, [])
  );

  const loadSecuritySettings = async () => {
    const isLocked = await AsyncStorage.getItem('isAppLockEnabled');
    setIsAppLockEnabled(isLocked === 'true');
  };

  const toggleAppLock = async () => {
    const newState = !isAppLockEnabled;
    setIsAppLockEnabled(newState);
    await AsyncStorage.setItem('isAppLockEnabled', newState ? 'true' : 'false');
  };


  const loadUserSession = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('userSession');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setUser({
          name: session.name || 'Explorer',
          email: session.email || '',
          photo: session.photo || 'https://i.pravatar.cc/300'
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const loadStats = async () => {
    try {
      // 🚀 OPTIMIZED: First try to load cached stats from AsyncStorage (set by HomeScreen)
      const statsStr = await AsyncStorage.getItem('userStats');
      if (statsStr) {
        const cachedStats = JSON.parse(statsStr);
        setStats({
          trips: (cachedStats.trips || 0).toString(),
          entries: (cachedStats.entries || 0).toString()
        });
        return; // Success, no need to re-fetch
      }

      const sessionStr = await AsyncStorage.getItem('userSession');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const userId = session.id || session.uid;
        if (userId) {
          const stories = await getUserStories(userId);

          // Calculate stats
          const totalEntries = stories.length;

          // Extract unique cities from "Country.State.City" or similar strings
          const uniqueCities = new Set();
          stories.forEach(story => {
            if (story.location) {
              const parts = story.location.split('.');
              const city = parts[parts.length - 1]?.trim();
              if (city) uniqueCities.add(city.toLowerCase());
            }
          });

          setStats({
            trips: uniqueCities.size.toString(),
            entries: totalEntries.toString()
          });
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };


  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to end your journey?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Sign out from Google
              await GoogleSignin.signOut().catch(() => { });

              // 2. Clear ALL AsyncStorage data
              await AsyncStorage.clear();

              // 3. Reset to Auth stack
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const renderStat = (label, value) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderSettingItem = (icon, title, subtitle, showToggle = false, value = false, onAction = null) => (
    <TouchableOpacity
      style={styles.settingItem}
      activeOpacity={0.7}
      onPress={!showToggle ? onAction : null}
      disabled={showToggle && !onAction}
    >
      <View style={styles.settingIconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {showToggle ? (
        <Switch
          value={value}
          onValueChange={onAction}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor={isDarkMode ? '#f4f3f4' : '#fff'}
        />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />

      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.photo }}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.userRole}>ADVENTURE EXPLORER • LEVEL 14</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {renderStat('TRIPS TAKEN', stats.trips)}
        {renderStat('JOURNAL ENTRIES', stats.entries)}
      </View>


      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>
        <View style={styles.settingsCard}>
          {renderSettingItem('account-outline', 'Personal Information', 'Update your name and profile photo', false, false, () => navigation.navigate('EditProfile'))}
          <View style={styles.divider} />
          {renderSettingItem('weather-night', 'Dark Mode', 'Sync with your system appearance', true, isDarkMode, toggleTheme)}
          <View style={styles.divider} />
          {renderSettingItem('fingerprint', 'App Lock', 'Require fingerprint to unlock Journiq', true, isAppLockEnabled, toggleAppLock)}
          <View style={styles.divider} />
          {renderSettingItem('bell-outline', 'Notifications', 'Stay updated on trip reminders')}
        </View>
      </View>

      {/* Logout Action */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="power" size={22} color={theme.colors.error} />
        <Text style={styles.logoutText}>End Session</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 110, // Ensure content is not cut off by the tab bar
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 75,
    padding: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...theme.shadows.sm,
  },
  userName: {
    fontSize: 28,
    color: theme.colors.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 12,
  },
  badgeContainer: {
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userRole: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignItems: 'center',
    width: '45%',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 1,
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceLight,
    marginHorizontal: 20,
    opacity: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.25)',
    backgroundColor: isDarkMode ? 'rgba(255, 77, 79, 0.08)' : 'rgba(255, 77, 79, 0.05)',
  },
  logoutText: {
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;