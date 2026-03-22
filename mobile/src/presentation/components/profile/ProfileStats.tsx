import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StoryRingAvatar } from '../shared/StoryRingAvatar';
import { useStoryStore } from '../../store/useStoryStore';

interface ProfileStatsProps {
  userId?: string;
  followingCount: string | number;
  followersCount: string | number;
  mainAvatarUrl: string;
  isDark: boolean;
  hasStories?: boolean;
  hasUnseenStory?: boolean;
  onAvatarPress?: () => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  userId,
  followingCount,
  followersCount,
  mainAvatarUrl,
  isDark,
  hasStories = false,
  hasUnseenStory,
  onAvatarPress,
}) => {
  const textColor = isDark ? '#fff' : '#000';
  const labelColor = isDark ? '#888' : '#555';
  const avatarSize = 90;

  // Reactive selector: re-renders only when this specific condition changes
  const isViewedLocal = useStoryStore(state => userId ? state.viewedUserIds.has(userId) : false);

  // If we have backend data (hasUnseenStory), rely on that (combined with local).
  // If hasUnseenStory is undefined (e.g. older usage without this prop), fallback to local logic.
  let isViewed = isViewedLocal;

  if (typeof hasUnseenStory !== 'undefined') {
    // If backend says hasUnseenStory=false, it means all read.
    // If backend says true, check local store too (maybe we just watched it)
    isViewed = !hasUnseenStory || isViewedLocal;
  }
  const ringViewed = hasStories ? isViewed : true;

  return (
    <View style={styles.container}>
      {/* Takipçi (Left) */}
      <View style={styles.statBox}>
        <View style={styles.textContainer}>
          <Text style={[styles.statNum, { color: textColor }]}>{followersCount}</Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>TAKİPÇİ</Text>
        </View>
      </View>

      {/* Main Avatar (Center) */}
      <Pressable onPress={onAvatarPress} style={styles.avatarWrapper}>
        <StoryRingAvatar
          avatarUrl={mainAvatarUrl}
          avatarSize={avatarSize}
          hasActiveStory={hasStories}
          isViewed={ringViewed}
          showViewedRingWhenNoStory={true}
        />
      </Pressable>

      {/* Takipte (Right) */}
      <View style={styles.statBox}>
        <View style={styles.textContainer}>
          <Text style={[styles.statNum, { color: textColor }]}>{followingCount}</Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>TAKİPTE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    marginBottom: 15,
    marginTop: 10,
  },
  statBox: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
