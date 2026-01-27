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

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated as RNAnimated,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Bookmark } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderOverlay } from './HeaderOverlay';
import { StoryBar } from './StoryBar';
import { MoreOptionsSheet } from '../sheets/MoreOptionsSheet';
import { DescriptionSheet } from '../sheets/DescriptionSheet';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

import { Video } from '../../../domain/entities/Video';
import { FEED_FLAGS, FEED_COLORS, SCREEN_WIDTH } from './hooks/useFeedConfig';

// ============================================================================
// Types
// ============================================================================

export interface FeedOverlaysProps {
    /** Active video */
    activeVideo: Video | null;
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
        } = props;

        const insets = useSafeAreaInsets();
        const moreOptionsSheetRef = useRef<BottomSheet>(null);
        const descriptionSheetRef = useRef<BottomSheet>(null);

        // Expose refs to parent
        useImperativeHandle(ref, () => ({
            get moreOptionsSheet() {
                return moreOptionsSheetRef.current;
            },
            get descriptionSheet() {
                return descriptionSheetRef.current;
            },
        }));

        // Skip rendering if overlays disabled
        if (FEED_FLAGS.DISABLE_GLOBAL_OVERLAYS) {
            return null;
        }

        return (
            <>
                {/* Save Toast */}
                {saveToast.message && (
                    <RNAnimated.View
                        pointerEvents="none"
                        style={[
                            styles.saveToast,
                            saveToast.active ? styles.saveToastActive : styles.saveToastInactive,
                            {
                                top: insets.top + 60,
                                opacity: saveToast.opacity,
                                transform: [{ translateY: saveToast.translateY }],
                            },
                        ]}
                    >
                        <View style={styles.saveToastContent}>
                            <Bookmark
                                size={18}
                                color={FEED_COLORS.SAVE_ICON_ACTIVE}
                                fill={saveToast.active ? FEED_COLORS.SAVE_ICON_ACTIVE : 'none'}
                                strokeWidth={1.6}
                            />
                            <Text style={[styles.saveToastText, styles.saveToastTextActive]}>
                                {saveToast.message}
                            </Text>
                        </View>
                    </RNAnimated.View>
                )}

                {/* Header Overlay */}
                {!isCleanScreen && (
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
                {!isCleanScreen && showStories && (
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
                    <MoreOptionsSheet
                        ref={moreOptionsSheetRef}
                        onCleanScreenPress={actions.onCleanScreen}
                        onDeletePress={isOwnActiveVideo ? actions.onSheetDelete : undefined}
                        isCleanScreen={isCleanScreen}
                    />

                    {/* Description Sheet */}
                    <DescriptionSheet
                        ref={descriptionSheetRef}
                        video={activeVideo}
                        onFollowPress={actions.onFollowPress}
                        onChange={actions.onDescriptionChange}
                    />

                    {/* Delete Modal */}
                    <DeleteConfirmationModal
                        visible={deleteModal.visible}
                        onCancel={deleteModal.onCancel}
                        onConfirm={deleteModal.onConfirm}
                    />
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
    saveToast: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 300,
        minWidth: 280,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: 'center',
        overflow: 'hidden',
    },
    saveToastActive: {
        backgroundColor: '#2c2c2e',
    },
    saveToastInactive: {
        backgroundColor: '#2c2c2e',
    },
    saveToastText: {
        fontSize: 17,
        fontWeight: '400',
        zIndex: 1,
    },
    saveToastTextActive: {
        color: '#FFFFFF',
    },
    saveToastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
