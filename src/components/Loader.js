import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';

const Loader = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Loader;
