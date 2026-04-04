import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

const GalleryScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Your Gallery</Text>
    <Text style={styles.subtitle}>Relive your memories</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});

export default GalleryScreen;
