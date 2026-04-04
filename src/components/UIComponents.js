import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';

export const Button = ({ title, onPress, loading, style, textStyle, type = 'primary' }) => {
  const backgroundColor = type === 'primary' ? theme.colors.primary : theme.colors.secondary;
  
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.white} />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export const Loader = () => (
  <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
);

export const TagChip = ({ label, style }) => (
  <View style={[styles.chip, style]}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  text: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: theme.fonts.sizes.md,
  },
  loader: {
    marginVertical: theme.spacing.xl,
  },
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.round,
  },
  chipText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: 'bold',
  },
});
