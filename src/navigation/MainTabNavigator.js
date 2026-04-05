import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import GalleryScreen from '../screens/GalleryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

const TabBarIcon = ({ name, color, focused, theme }) => {
  return (
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={name} color={color} size={28} />
      {focused && <View style={[styles.activeDot, { backgroundColor: theme.colors.primary }]} />}
    </View>
  );
};

const MainTabNavigator = () => {
  const { theme, isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          { 
            backgroundColor: isDarkMode ? theme.colors.surfaceDark : theme.colors.white,
            borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            borderTopWidth: 1,
          }
        ],
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDarkMode ? theme.colors.muted : theme.colors.black,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: (props) => <TabBarIcon name="book-open-variant" theme={theme} {...props} />,
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={SearchScreen}
        options={{
          tabBarIcon: (props) => <TabBarIcon name="compass-outline" theme={theme} {...props} />,
        }}
      />
      <Tab.Screen
        name="GalleryTab"
        component={GalleryScreen}
        options={{
          tabBarIcon: (props) => <TabBarIcon name="image-multiple-outline" theme={theme} {...props} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: (props) => <TabBarIcon name="account-outline" theme={theme} {...props} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 80,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
});

export default MainTabNavigator;
