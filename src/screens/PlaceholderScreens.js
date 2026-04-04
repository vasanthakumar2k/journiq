import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

const AddEntryScreen = () => (
  <View style={styles.container}><Text>Add Entry Screen</Text></View>
);

const EntryDetailScreen = ({ route }) => (
  <View style={styles.container}><Text>Entry Detail: {route.params?.entry?.title}</Text></View>
);

const ProfileScreen = () => (
  <View style={styles.container}><Text>Profile Screen</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
});

export { AddEntryScreen, EntryDetailScreen, ProfileScreen };
