import React, { forwardRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';
import { Avatar } from '../shared/Avatar';
import { Video } from '../../../domain/entities/Video';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';
import { logSheet, LogCode } from '@/core/services/Logger';

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
      logSheet(LogCode.SHEET_ACTION, 'Description sheet more menu pressed', { videoId: video?.id });
    };

    const handleClose = () => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.close();
      }
    };

    // When user tries to drag up, snap back to position 0
    const handleAnimate = useCallback((fromIndex: number, toIndex: number) => {
      // If trying to go above max snap point (index 0), snap back
      if (toIndex > 0 && ref && typeof ref !== 'function' && ref.current) {
        ref.current.snapToIndex(0);
      }
    }, [ref]);

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        index={-1}
        onChange={onChange}
        onAnimate={handleAnimate}
        enablePanDownToClose={true}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={true}
        backgroundStyle={{
          backgroundColor: bgColor,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleIndicatorStyle={{ backgroundColor: handleColor }}
      >
        {/* Fixed Header */}
        <View style={[styles.header, { backgroundColor: bgColor }]}>
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
                    {video.user.fullName || video.user.username}
                  </Text>
                  <Text style={[styles.username, { color: textSecondary }]}>
                    @{video.user.username}
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
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

        {/* Scrollable Content */}
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        >
          <Text style={[styles.description, { color: textPrimary }]}>
            {video?.description}
          </Text>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
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
    height: 1,
    marginVertical: 12,
    marginHorizontal: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
});
