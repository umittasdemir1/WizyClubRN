/**
 * FeedOverlays - Global Overlay Components
 *
 * Renders all global overlays for the feed:
 * - Save Toast notification
 * - Header Overlay
 * - Story Bar
 * - Bottom Sheets (More Options, Description)
 * - Delete Confirmation Modal
 *
 * @module presentation/components/feed/FeedOverlays
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
import { SaveToast } from './SaveToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderOverlay } from './HeaderOverlay';
import { StoryBar } from './StoryBar';
import { MoreOptionsSheet } from '../sheets/MoreOptionsSheet';
import { DescriptionSheet } from '../sheets/DescriptionSheet';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ActiveVideoOverlay } from './ActiveVideoOverlay';

import { Video } from '../../../domain/entities/Video';
import { FEED_COLORS, SCREEN_WIDTH, isDisabled } from './hooks/useFeedConfig';

// ============================================================================
// Types
// ============================================================================

export interface FeedOverlaysProps {
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
    /** Is muted */
    isMuted: boolean;
    /** Active tab */
    activeTab: 'stories' | 'foryou';
    /** Has unseen stories */
    hasUnseenStories: boolean;
    /** Show stories flag */
    showStories: boolean;
    /** Is custom feed */
    isCustomFeed: boolean;
    /** Story users */
    storyUsers: any[];
    /** UI opacity style */
    uiOpacityStyle: any;
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
        onToggleMute: () => void;
        onStoryPress: () => void;
        onUploadPress: () => void;
        onTabChange: (tab: 'stories' | 'foryou') => void;
        onStoryAvatarPress: (userId: string) => void;
        onCloseStoryBar: () => void;
        onCleanScreen: () => void;
        onSheetDelete: () => void;
        onFollowPress: () => void;
        onDescriptionChange: (index: number) => void;
        onBack: () => void;
        onLike: () => void;
        onSave: () => void;
        onShare: () => void;
        onShop: () => void;
        onDescription: () => void;
        onActionPressIn: () => void;
        onActionPressOut: () => void;
        onRestart: () => void;
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
        isFinished: boolean;
        currentTimeSV: SharedValue<number>;
        durationSV: SharedValue<number>;
    };
}

export interface FeedOverlaysRef {
    moreOptionsSheet: BottomSheet | null;
    descriptionSheet: BottomSheet | null;
}

// ============================================================================
// Component
// ============================================================================

export const FeedOverlays = forwardRef<FeedOverlaysRef, FeedOverlaysProps>(
    (props, ref) => {
        const {
            activeVideo,
            activeVideoId,
            isOwnActiveVideo,
            isCleanScreen,
            isSeeking,
            isMuted,
            activeTab,
            hasUnseenStories,
            showStories,
            isCustomFeed,
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

        // Memoize ActiveVideoOverlay props to prevent re-renders (Stable Props Pattern)
        const activeVideoData = useMemo(() => ({
            video: activeVideo as Video,
            currentUserId: props.currentUserId || undefined,
            activeIndex: props.activeIndex,
            isPlayable: props.isPlayable,
        }), [activeVideo, props.currentUserId, props.activeIndex, props.isPlayable]);

        const activeVideoPlayback = useMemo(() => ({
            isFinished: playback.isFinished,
            hasError: playback.hasError,
            retryCount: playback.retryCount,
            isCleanScreen: isCleanScreen,
            isSeeking: isSeeking,
            tapIndicator: playback.tapIndicator,
            rateLabel: playback.rateLabel,
        }), [playback.isFinished, playback.hasError, playback.retryCount, isCleanScreen, isSeeking, playback.tapIndicator, playback.rateLabel]);

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
            onRestart: actions.onRestart,
            playbackController: actions.playbackController,
            onActionPressIn: actions.onActionPressIn,
            onActionPressOut: actions.onActionPressOut,
        }), [actions.onLike, actions.onSave, actions.onShare, actions.onFollowPress, actions.onShop, actions.onDescription, actions.onRestart, actions.playbackController, actions.onActionPressIn, actions.onActionPressOut]);

        return (
            <>
                {/* Active Video Overlay (Buttons, Metadata, SeekBar) */}
                {activeVideo && !isDisabled('DISABLE_ACTIVE_VIDEO_OVERLAY') && (
                    <ActiveVideoOverlay
                        data={activeVideoData}
                        playback={activeVideoPlayback}
                        timeline={activeVideoTimeline}
                        actions={activeVideoActions}
                    />
                )}

                {/* Save Toast */}
                <SaveToast
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
                        <HeaderOverlay
                            isMuted={isMuted}
                            onToggleMute={actions.onToggleMute}
                            onStoryPress={actions.onStoryPress}
                            onUploadPress={actions.onUploadPress}
                            activeTab={activeTab}
                            onTabChange={actions.onTabChange}
                            showBrightnessButton={false}
                            hasUnseenStories={hasUnseenStories}
                            showBack={isCustomFeed}
                            onBack={actions.onBack}
                        />
                    </Animated.View>
                )}

                {/* Story Bar */}
                {!isCleanScreen && showStories && !isDisabled('DISABLE_STORY_BAR') && (
                    <StoryBar
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
                        <DeleteConfirmationModal
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

FeedOverlays.displayName = 'FeedOverlays';

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
