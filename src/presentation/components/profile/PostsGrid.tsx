import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Eye, Play } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 2;
const PADDING = 2;
// Calculate item width: Total width minus padding and gaps, divided by 3
// For 3 columns: we need 2 gaps between columns
const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - (PADDING * 2) - (GAP * 2)) / 3);

interface PostItem {
  id: string;
  thumbnail: string;
  views: string;
  type?: 'image' | 'video'; // Optional: to differentiate between images and videos
}

interface PostsGridProps {
  posts: PostItem[];
  isDark: boolean;
}

export const PostsGrid: React.FC<PostsGridProps> = ({ posts, isDark }) => {
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
      {posts.map((post, index) => (
        <TouchableOpacity
          key={post.id}
          style={[
            styles.postItem,
            { backgroundColor: bgColor },
            // Add margin to create gaps between items
            index % 3 !== 2 && { marginRight: GAP }, // Not the last column
            { marginBottom: GAP }, // Gap between rows
          ]}
        >
          <Image
            source={{ uri: post.thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          {/* Gradient Shadow for Readability */}
          <View style={styles.gradientOverlay} />
          {/* Stats */}
          <View style={styles.stats}>
            {post.type === 'video' ? (
              <Play size={12} color="#fff" fill="#fff" />
            ) : (
              <Eye size={12} color="#fff" />
            )}
            <Text style={styles.viewsText}>{formatViews(post.views)}</Text>
          </View>
        </TouchableOpacity>
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
  postItem: {
    width: ITEM_WIDTH,
    aspectRatio: 1, // Square format (1:1)
    position: 'relative',
    overflow: 'hidden',
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
