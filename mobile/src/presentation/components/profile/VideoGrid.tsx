import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 2;
const PADDING = 2;
// Calculate item width: Total width minus padding and gaps, divided by 3
// For 3 columns: we need 2 gaps between columns
const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - (PADDING * 2) - (GAP * 2)) / 3);

interface VideoItem {
  id: string;
  thumbnail: string;
  views: string;
}

interface VideoGridProps {
  videos: VideoItem[];
  isDark: boolean;
  onPress?: (video: VideoItem, index: number) => void;
  onPreview?: (video: VideoItem) => void;
  onPreviewEnd?: () => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  isDark,
  onPress,
  onPreview,
  onPreviewEnd,
}) => {
  const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';

  const formatViews = (views: string | number): string => {
    if (typeof views === 'string') return views;

    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  return (
    <View style={styles.container}>
      {videos.map((video, index) => (
        <Pressable
          key={video.id}
          style={[
            styles.videoItem,
            { backgroundColor: bgColor },
            // Add margin to create gaps between items
            index % 3 !== 2 && { marginRight: GAP }, // Not the last column
            { marginBottom: GAP }, // Gap between rows
          ]}
          onLongPress={() => onPreview?.(video)}
          onPress={() => onPress?.(video, index)}
          onPressOut={onPreviewEnd}
        >
          <Image
            source={{ uri: video.thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          {/* Gradient Shadow for Readability */}
          <View style={styles.gradientOverlay} />
          {/* Stats */}
          <View style={styles.stats}>
            <Play size={12} color="#fff" strokeWidth={2.5} />
            <Text style={styles.viewsText}>{formatViews(video.views)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    marginTop: 5,
  },
  videoItem: {
    width: ITEM_WIDTH,
    aspectRatio: 9 / 16, // Video format
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'transparent',
    // React Native doesn't support CSS gradients, we'll use opacity on the stats background
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
