import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Archive } from 'lucide-react-native';
import { Draft } from '../../../domain/entities/Draft';
import { textShadowStyle } from '@/core/utils/shadow';

interface DraftsFolderCardProps {
  drafts: Draft[];
  isDark: boolean;
  itemWidth: number;
  onPress: () => void;
}

export const DraftsFolderCard: React.FC<DraftsFolderCardProps> = ({
  drafts,
  isDark,
  itemWidth,
  onPress,
}) => {
  const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';
  const textColor = '#FFFFFF';

  const draftCount = drafts.length;
  const mostRecentDraft = drafts[0];

  return (
    <Pressable
      style={[
        styles.container,
        { width: itemWidth, aspectRatio: 0.8, backgroundColor: bgColor },
      ]}
      onPress={onPress}
    >
      {/* Background thumbnail if draft exists */}
      {mostRecentDraft && mostRecentDraft.thumbnailUri && (
        <Image
          source={{ uri: mostRecentDraft.thumbnailUri }}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      )}

      {/* Dark Gradient/Overlay for readability */}
      <View style={styles.overlay} />

      {/* Top Left: Title & Count */}
      <Text style={[styles.title, { color: textColor }]}>
        Taslaklar: {draftCount}
      </Text>

      {/* Bottom Left: Icon */}
      <View style={styles.iconContainer}>
        <Archive size={16} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Lighter overlay since items are spaced out
  },
  title: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: 12,
    fontWeight: '600',
    ...textShadowStyle('rgba(0, 0, 0, 0.5)', { width: 0, height: 1 }, 3),
  },
  iconContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
