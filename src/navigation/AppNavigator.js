import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import AddEntryScreen from '../screens/AddEntryScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import EditEntryScreen from '../screens/EditEntryScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="AddEntry"
        component={AddEntryScreen}
      // options={{ headerShown: true, title: 'Add Entry' }} 
      />
      <Stack.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
      // options={{ headerShown: true, title: 'Entry Detail' }}
      />
      <Stack.Screen
        name="EditEntry"
        component={EditEntryScreen}
        options={{ headerShown: true, title: 'Edit Entry' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
