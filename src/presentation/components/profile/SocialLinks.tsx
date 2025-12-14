import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Youtube, Instagram, Music2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

// X (Twitter) için custom SVG component
const XIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </Svg>
);

interface SocialLinksProps {
  clubsCount: number;
  clubLogos: string[];
  isDark: boolean;
  onClubsPress?: () => void;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({
  clubsCount,
  clubLogos,
  isDark,
  onClubsPress,
}) => {
  const iconColor = isDark ? '#fff' : '#000';
  const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const separatorColor = isDark ? '#888' : '#555';
  const textColor = isDark ? '#fff' : '#000';
  const subtitleColor = isDark ? '#888' : '#555';

  return (
    <View style={styles.container}>
      {/* Sol: Sosyal Medya İkonları */}
      <View style={styles.socialLeft}>
        <TouchableOpacity
          style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
        >
          <Youtube size={14} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
        >
          <Instagram size={14} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
        >
          <Music2 size={14} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
        >
          <XIcon size={14} color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* Separator */}
      <View style={[styles.separator, { backgroundColor: separatorColor }]} />

      {/* Sağ: Clubs */}
      <TouchableOpacity style={styles.socialRight} onPress={onClubsPress} activeOpacity={0.7}>
        <View style={styles.clubsAvatars}>
          {clubLogos.slice(0, 3).map((logo, index) => (
            <View
              key={index}
              style={[
                styles.clubAvatar,
                {
                  marginLeft: index === 0 ? 0 : -10,
                  zIndex: clubLogos.length - index,
                  borderColor: isDark ? '#000' : '#fff',
                },
              ]}
            >
              <Image
                source={{ uri: logo }}
                style={styles.clubAvatarImage}
                contentFit="contain"
              />
            </View>
          ))}
        </View>
        <View style={styles.clubsText}>
          <Text style={[styles.clubTitle, { color: textColor }]}>
            {clubsCount} CLUB's
          </Text>
          <Text style={[styles.clubSubtitle, { color: subtitleColor }]}>
            ile işbirliği
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  socialLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 12,
  },
  socialTag: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  separator: {
    width: 1,
    height: 26,
    opacity: 0.3,
  },
  socialRight: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingLeft: 12,
  },
  clubsAvatars: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  clubAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  clubAvatarImage: {
    width: '100%',
    height: '100%',
  },
  clubsText: {
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 'auto',
  },
  clubTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  clubSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
});
