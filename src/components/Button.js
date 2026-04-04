import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const Button = ({ title, onPress, loading, style, textStyle, type = 'primary' }) => {
  const { theme, isDarkMode } = useTheme();
  
  const getButtonStyle = () => {
    if (type === 'glass') {
      return {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.7)',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(123, 97, 255, 0.3)',
        borderWidth: 1,
        ...theme.shadows.sm,
      };
    }
    return {
      backgroundColor: type === 'primary' ? theme.colors.primary : theme.colors.secondary,
      ...theme.shadows.md,
    };
  };

  const getTextColor = () => {
    if (type === 'glass') {
      return isDarkMode ? theme.colors.text : theme.colors.primary;
    }
    return theme.colors.white;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default Button;
