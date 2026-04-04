import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import TagChip from './TagChip';

const Card = ({ title, location, date, tags, imageSource, onPress }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <ImageBackground 
        source={imageSource || { uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000' }} 
        style={styles.imageBackground}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.overlay}>
          <View style={styles.topInfo}>
            <View style={styles.locationContainer}>
              <Text style={styles.location}>{location}</Text>
            </View>
          </View>
          <View style={styles.bottomInfo}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.date}>{date}</Text>
              <View style={styles.tagContainer}>
                {tags && tags.slice(0, 2).map((tag, index) => (
                  <TagChip key={index} label={tag} small />
                ))}
                {tags && tags.length > 2 && (
                  <Text style={styles.moreTags}>+{tags.length - 2}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const createStyles = (theme) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    height: 400,
    ...theme.shadows.lg,
  },
  imageBackground: {
    flex: 1,
  },
  imageStyle: {
    borderRadius: theme.borderRadius.lg,
  },
  overlay: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)', // Keep dark overlay for contrast on light mode too
  },
  locationContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  location: {
    color: '#FFFFFF',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomInfo: {
    paddingBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreTags: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: 'bold',
  },
});

export default Card;
