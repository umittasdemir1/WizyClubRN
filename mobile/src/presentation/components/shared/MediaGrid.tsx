import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Eye, Play } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 3;

interface MediaGridItem {
  id: string;
  thumbnail: string;
  views?: string | number;
  type?: 'image' | 'video';
}

interface MediaGridProps {
  items: MediaGridItem[];
  isDark: boolean;
  aspectRatio: number;
  onPress?: (item: MediaGridItem, index: number) => void;
  onPreview?: (item: MediaGridItem) => void;
  onPreviewEnd?: () => void;
  headerComponent?: React.ReactNode;
  gap?: number;
  padding?: number;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  isDark,
  aspectRatio,
  onPress,
  onPreview,
  onPreviewEnd,
  headerComponent,
  gap = 2,
  padding = 2,
}) => {
  const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';
  const itemWidth = Math.floor((SCREEN_WIDTH - (padding * 2) - (gap * 2)) / COLUMN_COUNT);
  const offset = headerComponent ? 1 : 0;

  const formatViews = (views: string | number): string => {
    if (typeof views === 'string') return views;
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
    return views.toString();
  };

  return (
    <View style={[styles.container, { paddingHorizontal: padding, rowGap: gap }]}>
      {headerComponent && (
        <View style={{ marginRight: gap, marginBottom: gap }}>
          {headerComponent}
        </View>
      )}
      {items.map((item, index) => {
        const gridIndex = index + offset;
        return (
          <Pressable
            key={item.id}
            style={[
              styles.item,
              { backgroundColor: bgColor, width: itemWidth, aspectRatio },
              gridIndex % COLUMN_COUNT !== COLUMN_COUNT - 1 && { marginRight: gap },
              { marginBottom: gap },
            ]}
            onLongPress={() => onPreview?.(item)}
            onPress={() => onPress?.(item, index)}
            onPressOut={onPreviewEnd}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} contentFit="cover" />
            {item.views !== undefined && (
              <View style={styles.stats}>
                {item.type === 'image' ? (
                  <Eye size={12} color="#fff" />
                ) : (
                  <Play size={12} color="#fff" strokeWidth={2.5} />
                )}
                <Text style={styles.viewsText}>{formatViews(item.views)}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  item: {
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  stats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 2,
  },
  viewsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
