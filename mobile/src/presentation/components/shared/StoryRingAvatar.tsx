import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from './Avatar';
import { AdvancedStoryRing } from './AdvancedStoryRing';

interface StoryRingAvatarProps {
  avatarUrl?: string;
  avatarSize: number;
  hasActiveStory?: boolean;
  isViewed?: boolean;
  showViewedRingWhenNoStory?: boolean;
  thickness?: number;
  gap?: number;
  fallbackColor?: string;
}

export const StoryRingAvatar = memo(function StoryRingAvatar({
  avatarUrl,
  avatarSize,
  hasActiveStory = false,
  isViewed = false,
  showViewedRingWhenNoStory = true,
  thickness = 1.5,
  gap = 1.5,
  fallbackColor = '#2A2A2A',
}: StoryRingAvatarProps) {
  const shouldRenderRing = hasActiveStory || showViewedRingWhenNoStory;
  const ringViewed = hasActiveStory ? isViewed : true;
  const ringSize = avatarSize + (thickness * 2) + (gap * 2);

  const avatarNode = (
    <View
      style={[
        styles.avatarSurface,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: fallbackColor,
        },
      ]}
    >
      <Avatar url={avatarUrl} size={avatarSize} />
    </View>
  );

  if (!shouldRenderRing) {
    return avatarNode;
  }

  return (
    <AdvancedStoryRing size={ringSize} thickness={thickness} gap={gap} viewed={ringViewed}>
      {avatarNode}
    </AdvancedStoryRing>
  );
});

const styles = StyleSheet.create({
  avatarSurface: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
