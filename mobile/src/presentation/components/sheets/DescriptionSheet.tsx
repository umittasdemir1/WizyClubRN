import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';
import { Avatar } from '../shared/Avatar';
import { Video } from '../../../domain/entities/Video';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

interface DescriptionSheetProps {
  video: Video | null;
  onFollowPress?: () => void;
  onChange?: (index: number) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DescriptionSheet = forwardRef<BottomSheet, DescriptionSheetProps>(
  ({ video, onFollowPress, onChange }, ref) => {
    const { isDark } = useThemeStore();
    const insets = useSafeAreaInsets();

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;
    const textPrimary = themeColors.textPrimary;
    const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const handleColor = isDark ? '#8e8e93' : '#c6c6c8';

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const handleInternalMore = () => {
      console.log('Internal More Menu Pressed - Separate from feed');
    };

    const handleClose = () => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.close();
      }
    };

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        enableOverDrag={false}
        overDragResistanceFactor={0}
        index={-1}
        onChange={onChange}
        backgroundStyle={{
          backgroundColor: bgColor,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleIndicatorStyle={{ backgroundColor: handleColor }}
      >
        <BottomSheetScrollView style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={handleClose}
                style={styles.backButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <ChevronLeft size={28} color={textPrimary} />
              </Pressable>

              {video && (
                <>
                  <Avatar url={video.user.avatarUrl} size={44} hasBorder={true} />
                  <View style={styles.userInfo}>
                    <Text style={[styles.fullName, { color: textPrimary }]}>
                      {video.user.username}
                    </Text>
                    <Text style={[styles.username, { color: textSecondary }]}>
                      @{video.user.id.toLowerCase().replace(/\s+/g, '_')}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.headerRight}>
              {video && !video.user.isFollowing && (
                <Pressable
                  style={[
                    styles.followPill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  onPress={onFollowPress}
                  hitSlop={8}
                >
                  <Text style={[styles.followText, { color: textPrimary }]}>Takip Et</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleInternalMore}
                style={styles.moreButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MoreVertical size={24} color={textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description Content */}
          <Text style={[styles.description, { color: textPrimary }]}>
            {video?.description}
          </Text>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  backButton: {
    marginRight: 8,
  },
  userInfo: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  fullName: {
    fontSize: 15,
    fontWeight: '700',
  },
  username: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  followPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  divider: {
    height: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
