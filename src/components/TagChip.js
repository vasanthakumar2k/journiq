import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const TagChip = ({ label, style, small }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[
      styles.chip, 
      small && styles.chipSmall,
      style
    ]}>
      <Text style={[
        styles.chipText,
        small && styles.chipTextSmall
      ]}>{label}</Text>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipTextSmall: {
    fontSize: 10,
  },
});

export default TagChip;
