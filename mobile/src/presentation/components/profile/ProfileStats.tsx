import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AvatarStack } from './AvatarStack';
import { Avatar } from '../shared/Avatar';

interface ProfileStatsProps {
  followingCount: string;
  followingAvatars: string[];
  followersCount: string;
  followersAvatars: string[];
  mainAvatarUrl: string;
  isDark: boolean;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  followingCount,
  followingAvatars,
  followersCount,
  followersAvatars,
  mainAvatarUrl,
  isDark,
}) => {
  const textColor = isDark ? '#fff' : '#000';
  const labelColor = isDark ? '#888' : '#555';
  const borderColor = isDark ? '#000' : '#fff';
  const cardBg = isDark ? '#1c1c1e' : '#f0f0f0';

  return (
    <View style={styles.container}>
      {/* Takipçi (Left) */}
      <View style={styles.statBox}>
        <View style={styles.textContainer}>
          <Text style={[styles.statNum, { color: textColor }]}>{followersCount}</Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>TAKİPÇİ</Text>
        </View>
        <View style={styles.avatarContainer}>
          <AvatarStack
            avatars={followersAvatars}
            size={30}
            overlap={10}
            borderColor={borderColor}
            borderWidth={1.5}
          />
        </View>
      </View>

      {/* Main Avatar (Center) */}
      <View style={[styles.avatarBox, { borderColor: cardBg }]}>
        <Avatar url={mainAvatarUrl} size={90} />
      </View>

      {/* Takipte (Right) */}
      <View style={styles.statBox}>
        <View style={styles.textContainer}>
          <Text style={[styles.statNum, { color: textColor }]}>{followingCount}</Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>TAKİPTE</Text>
        </View>
        <View style={styles.avatarContainer}>
          <AvatarStack
            avatars={followingAvatars}
            size={30}
            overlap={10}
            borderColor={borderColor}
            borderWidth={1.5}
          />
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
  avatarContainer: {
    // paddingLeft: 10, Removed to center alignment better
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
  avatarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
