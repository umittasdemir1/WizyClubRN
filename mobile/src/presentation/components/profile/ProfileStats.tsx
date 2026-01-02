import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Avatar } from '../shared/Avatar';
import { AdvancedStoryRing } from '../shared/AdvancedStoryRing';
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
  const cardBg = isDark ? '#1c1c1e' : '#f0f0f0';
  const avatarSize = 90;
  // Desired specs: 3px thickness, 3px gap
  const THICKNESS = 3;
  const GAP = 3;
  const RING_SIZE = avatarSize + (THICKNESS * 2) + (GAP * 2);

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
        {hasStories ? (
          <AdvancedStoryRing size={RING_SIZE} thickness={THICKNESS} gap={GAP} viewed={isViewed}>
            <Avatar url={mainAvatarUrl} size={avatarSize} />
          </AdvancedStoryRing>
        ) : (
          <View style={[styles.avatarBox, { borderColor: cardBg, borderWidth: 2 }]}>
            <Avatar url={mainAvatarUrl} size={avatarSize} />
          </View>
        )}
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
  avatarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
