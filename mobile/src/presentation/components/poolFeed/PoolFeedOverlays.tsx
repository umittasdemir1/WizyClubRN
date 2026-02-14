/**
 * PoolFeedOverlays - Global Overlay Components
 *
 * Renders all global overlays for the feed:
 * - Save Toast notification
 * - Header Overlay
 * - Story Bar
 * - Bottom Sheets (More Options, Description)
 * - Delete Confirmation Modal
 *
 * @module presentation/components/feed/PoolFeedOverlays
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated as RNAnimated,
} from 'react-native';
import Animated, { SharedValue } from 'react-native-reanimated';

import BottomSheet from '@gorhom/bottom-sheet';
import { PoolFeedSaveToast } from './PoolFeedSaveToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PoolFeedHeaderOverlay } from './PoolFeedHeaderOverlay';
import { PoolFeedStoryBar } from './PoolFeedStoryBar';
import { MoreOptionsSheet } from '../sheets/MoreOptionsSheet';
import { DescriptionSheet } from '../sheets/DescriptionSheet';
import { PoolFeedDeleteConfirmationModal } from './PoolFeedDeleteConfirmationModal';
import { PoolFeedActiveVideoOverlay } from './PoolFeedActiveVideoOverlay';

import { Video } from '../../../domain/entities/Video';
import { FEED_COLORS, SCREEN_WIDTH, isDisabled } from './hooks/usePoolFeedConfig';

// ============================================================================
// Types
// ============================================================================

export interface PoolFeedOverlaysProps {
    /** Active video */
    activeVideo: Video | null;
    /** Sheet Refs for hook integration */
    moreOptionsSheetRef: React.RefObject<BottomSheet>;
    descriptionSheetRef: React.RefObject<BottomSheet>;
    /** Active video ID */
    activeVideoId: string | null;
    /** Current user ID */
    currentUserId: string | null;
    /** Is own video */
    isOwnActiveVideo: boolean;
    /** Is clean screen mode */
    isCleanScreen: boolean;
    /** Is seeking */
    isSeeking: boolean;
    /** Active tab */
    activeTab: 'stories' | 'foryou';
    /** Show stories flag */
    showStories: boolean;
    /** Story users */
    storyUsers: any[];
    /** UI opacity style */
    uiOpacityStyle: any;
    /** Preloaded overlay items (active + neighbors) */
    overlayItems?: Array<{
        video: Video;
        index: number;
        isPlayable: boolean;
    }>;
    /** Current active index */
    activeIndex: number;
    /** Is active video playable */
    isPlayable: boolean;
    /** Current scroll Y (SharedValue) */
    scrollY: SharedValue<number>;
    /** Is currently scrolling (SharedValue) */
    isScrollingSV: SharedValue<boolean>;
    /** Save toast state */
    saveToast: {
        message: string | null;
        active: boolean;
        opacity: RNAnimated.Value;
        translateY: RNAnimated.Value;
    };
    /** Delete modal state */
    deleteModal: {
        visible: boolean;
        onCancel: () => void;
        onConfirm: () => void;
    };
    /** Action handlers */
    actions: {
        onBack: () => void;
        onUploadPress: () => void;
        onStoryAvatarPress: (userId: string) => void;
        onCloseStoryBar: () => void;
        onCleanScreen: () => void;
        onSheetDelete: () => void;
        onFollowPress: () => void;
        onDescriptionChange: (index: number) => void;
        onLike: () => void;
        onSave: () => void;
        onShare: () => void;
        onShop: () => void;
        onDescription: () => void;
        onActionPressIn: () => void;
        onActionPressOut: () => void;
        playbackController: {
            seekTo: (time: number) => void;
            retryActive: () => void;
        };
    };
    /** Playback and interaction state */
    playback: {
        isPaused: boolean;
        hasError: boolean;
        retryCount: number;
        rateLabel: string | null;
        tapIndicator: 'play' | 'pause' | null;
        currentTimeSV: SharedValue<number>;
        durationSV: SharedValue<number>;
    };
}

export interface PoolFeedOverlaysRef {
    moreOptionsSheet: BottomSheet | null;
    descriptionSheet: BottomSheet | null;
}

// ============================================================================
// Component
// ============================================================================

export const PoolFeedOverlays = forwardRef<PoolFeedOverlaysRef, PoolFeedOverlaysProps>(
    (props, ref) => {
        const {
            activeVideo,
            isOwnActiveVideo,
            isCleanScreen,
            isSeeking,
            activeTab,
            showStories,
            storyUsers,
            uiOpacityStyle,
            saveToast,
            deleteModal,
            actions,
            playback,
            moreOptionsSheetRef,
            descriptionSheetRef,
        } = props;

        const insets = useSafeAreaInsets();

        // Expose refs to parent
        useImperativeHandle(ref, () => ({
            get moreOptionsSheet() {
                return moreOptionsSheetRef.current;
            },
            get descriptionSheet() {
                return descriptionSheetRef.current;
            },
        }));

        // Global UI Master Check
        if (isDisabled('DISABLE_ALL_UI')) {
            return null;
        }

        const overlayTargets = useMemo(() => {
            if (props.overlayItems && props.overlayItems.length > 0) {
                return props.overlayItems;
            }
            if (activeVideo) {
                return [{
                    video: activeVideo,
                    index: props.activeIndex,
                    isPlayable: props.isPlayable,
                }];
            }
            return [];
        }, [props.overlayItems, activeVideo, props.activeIndex, props.isPlayable]);
        const activeStoryUserIds = useMemo(
            () => new Set<string>((storyUsers ?? []).map((user: any) => user?.id).filter(Boolean)),
            [storyUsers]
        );

        const overlayDataList = useMemo(() => (
            overlayTargets.map((item) => ({
                key: item.video.id,
                data: {
                    video: item.video,
                    currentUserId: props.currentUserId || undefined,
                    hasActiveStory: Boolean(item.video.user?.id && activeStoryUserIds.has(item.video.user.id)),
                    activeIndex: item.index,
                    isPlayable: item.isPlayable,
                }
            }))
        ), [activeStoryUserIds, overlayTargets, props.currentUserId]);

        const activeVideoPlayback = useMemo(() => ({
            hasError: playback.hasError,
            retryCount: playback.retryCount,
            isCleanScreen: isCleanScreen,
            isSeeking: isSeeking,
            tapIndicator: playback.tapIndicator,
            rateLabel: playback.rateLabel,
        }), [playback.hasError, playback.retryCount, isCleanScreen, isSeeking, playback.tapIndicator, playback.rateLabel]);

        const activeVideoTimeline = useMemo(() => ({
            currentTimeSV: playback.currentTimeSV,
            durationSV: playback.durationSV,
            isScrollingSV: props.isScrollingSV,
            scrollY: props.scrollY,
        }), [playback.currentTimeSV, playback.durationSV, props.isScrollingSV, props.scrollY]);

        const activeVideoActions = useMemo(() => ({
            onToggleLike: actions.onLike,
            onToggleSave: actions.onSave,
            onToggleShare: actions.onShare,
            onToggleFollow: actions.onFollowPress,
            onOpenShopping: actions.onShop,
            onOpenDescription: actions.onDescription,
            playbackController: actions.playbackController,
            onActionPressIn: actions.onActionPressIn,
            onActionPressOut: actions.onActionPressOut,
        }), [actions.onLike, actions.onSave, actions.onShare, actions.onFollowPress, actions.onShop, actions.onDescription, actions.playbackController, actions.onActionPressIn, actions.onActionPressOut]);

        return (
            <>
                {/* Active Video Overlay (Buttons, Metadata, SeekBar) */}
                {overlayDataList.length > 0 && !isDisabled('DISABLE_ACTIVE_VIDEO_OVERLAY') && (
                    <>
                        {overlayDataList.map((overlay) => (
                            <PoolFeedActiveVideoOverlay
                                key={overlay.key}
                                data={overlay.data}
                                playback={activeVideoPlayback}
                                timeline={activeVideoTimeline}
                                actions={activeVideoActions}
                            />
                        ))}
                    </>
                )}

                {/* Save Toast */}
                <PoolFeedSaveToast
                    message={saveToast.message}
                    active={saveToast.active}
                    opacity={saveToast.opacity}
                    translateY={saveToast.translateY}
                />

                {/* Header Overlay */}
                {!isCleanScreen && !isDisabled('DISABLE_HEADER_OVERLAY') && (
                    <Animated.View
                        style={[StyleSheet.absoluteFill, { zIndex: 100 }, uiOpacityStyle]}
                        pointerEvents={isSeeking ? 'none' : 'box-none'}
                    >
                        <PoolFeedHeaderOverlay
                            onBack={actions.onBack}
                            onUploadPress={actions.onUploadPress}
                            showBrightnessButton={false}
                            showBack={false}
                        />
                    </Animated.View>
                )}

                {/* Story Bar */}
                {!isCleanScreen && showStories && !isDisabled('DISABLE_STORY_BAR') && (
                    <PoolFeedStoryBar
                        isVisible={activeTab === 'stories'}
                        storyUsers={storyUsers}
                        onAvatarPress={actions.onStoryAvatarPress}
                        onClose={actions.onCloseStoryBar}
                    />
                )}

                {/* Story touch interceptor */}
                {!isCleanScreen && activeTab === 'stories' && (
                    <Pressable style={styles.touchInterceptor} onPress={actions.onCloseStoryBar} />
                )}

                {/* Bottom Sheets & Modals Container */}
                <View style={styles.sheetsContainer} pointerEvents="box-none">
                    {/* More Options Sheet */}
                    {!isDisabled('DISABLE_SHEETS') && (
                        <MoreOptionsSheet
                            ref={moreOptionsSheetRef}
                            onCleanScreenPress={actions.onCleanScreen}
                            onDeletePress={isOwnActiveVideo ? actions.onSheetDelete : undefined}
                            isCleanScreen={isCleanScreen}
                        />
                    )}

                    {/* Description Sheet */}
                    {!isDisabled('DISABLE_SHEETS') && (
                        <DescriptionSheet
                            ref={descriptionSheetRef}
                            video={activeVideo}
                            onFollowPress={actions.onFollowPress}
                            onChange={actions.onDescriptionChange}
                        />
                    )}

                    {/* Delete Modal */}
                    {!isDisabled('DISABLE_MODALS') && (
                        <PoolFeedDeleteConfirmationModal
                            visible={deleteModal.visible}
                            onCancel={deleteModal.onCancel}
                            onConfirm={deleteModal.onConfirm}
                        />
                    )}
                </View>
            </>
        );
    }
);

PoolFeedOverlays.displayName = 'PoolFeedOverlays';

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    touchInterceptor: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        backgroundColor: 'transparent',
    },
    sheetsContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
});
