import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AvatarStack } from './AvatarStack';

interface ProfileStatsProps {
  followingCount: string;
  followingAvatars: string[];
  followersCount: string;
  followersAvatars: string[];
  isDark: boolean;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  followingCount,
  followingAvatars,
  followersCount,
  followersAvatars,
  isDark,
}) => {
  const textColor = isDark ? '#fff' : '#000';
  const labelColor = isDark ? '#888' : '#555';
  const borderColor = isDark ? '#000' : '#fff';

  return (
    <View style={styles.container}>
      {/* Takipte */}
      <View style={styles.statBox}>
        <View style={styles.avatarContainer}>
          <AvatarStack
            avatars={followingAvatars}
            size={30}
            overlap={10}
            borderColor={borderColor}
            borderWidth={1.5}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.statNum, { color: textColor }]}>{followingCount}</Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>TAKİPTE</Text>
        </View>
      </View>

      {/* Takipçi */}
      <View style={styles.statBox}>
        <View style={styles.avatarContainer}>
          <AvatarStack
            avatars={followersAvatars}
            size={30}
            overlap={10}
            borderColor={borderColor}
            borderWidth={1.5}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.statNum, { color: textColor }]}>{followersCount}</Text>
          <Text style={[styles.statLabel, { color: labelColor }]}>TAKİPÇİ</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
    width: '100%',
    marginBottom: 25,
  },
  statBox: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatarContainer: {
    paddingLeft: 10,
    marginBottom: 6,
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
