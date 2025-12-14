import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';

interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
}

interface HighlightPillsProps {
  highlights: Highlight[];
  isDark: boolean;
}

export const HighlightPills: React.FC<HighlightPillsProps> = ({
  highlights,
  isDark,
}) => {
  const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';
  const textColor = isDark ? '#888' : '#555';
  const borderColor = isDark ? '#1c1c1e' : '#f0f0f0';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {highlights.map((highlight) => (
        <TouchableOpacity
          key={highlight.id}
          style={[styles.pill, { backgroundColor: bgColor, borderColor }]}
        >
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: highlight.thumbnail }}
              style={styles.image}
              contentFit="cover"
            />
            <View style={styles.playIconOverlay}>
              <Play size={10} color="#fff" fill="#fff" />
            </View>
          </View>
          <Text style={[styles.text, { color: textColor }]}>{highlight.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 15,
    gap: 10,
  },
  pill: {
    borderRadius: 50,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  imageWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  image: {
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0.8,
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
