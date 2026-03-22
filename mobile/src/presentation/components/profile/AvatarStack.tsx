import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface AvatarStackProps {
  avatars: string[];
  size?: number;
  overlap?: number;
  borderColor?: string;
  borderWidth?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  size = 30,
  overlap = 10,
  borderColor = '#000',
  borderWidth = 1.5,
}) => {
  return (
    <View style={styles.container}>
      {avatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.avatarWrapper,
            {
              width: size,
              height: size,
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: avatars.length - index,
              borderColor,
              borderWidth,
            },
          ]}
        >
          <Image
            source={{ uri: avatar }}
            style={[styles.avatar, { width: size, height: size }]}
            contentFit="cover"
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  avatar: {
    borderRadius: 100,
  },
});
