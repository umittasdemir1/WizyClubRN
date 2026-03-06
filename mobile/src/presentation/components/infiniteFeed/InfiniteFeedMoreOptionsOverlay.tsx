import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { InfiniteFeedVideo } from './InfiniteFeedVideoTypes';
import { InfiniteFeedMoreOptionsSheet } from './InfiniteFeedMoreOptionsSheet';
import { InfiniteFeedDeleteConfirmationModal } from './InfiniteFeedDeleteConfirmationModal';
import type { SubtitlePreferenceMode } from '../../store/useSubtitlePreferencesStore';

interface MoreOptionsSelection {
    creatorUserId: string | null;
    isFollowingCreator: boolean;
    isOwnVideo: boolean;
    showSubtitleOption: boolean;
    video: InfiniteFeedVideo;
}

interface OpenMoreOptionsPayload {
    currentUserId?: string | null;
    showSubtitleOption: boolean;
    video: InfiniteFeedVideo;
}

interface InfiniteFeedMoreOptionsOverlayProps {
    onAboutAccountPress: (userId: string) => void;
    onDeleteConfirm: (videoId: string) => void;
    onEditPress: (video: InfiniteFeedVideo) => void | Promise<void>;
    onQrCodePress?: () => void;
    onSavePress: (videoId: string) => void;
    onShowMorePress?: () => void;
    onSubtitleModeChange?: (mode: SubtitlePreferenceMode) => void;
    onUnfollowPress: (videoId: string) => void;
    onWhyThisPostPress?: () => void;
    subtitleMode: SubtitlePreferenceMode;
}

export interface InfiniteFeedMoreOptionsOverlayHandle {
    close: () => void;
    open: (payload: OpenMoreOptionsPayload) => void;
    updateSubtitleOption: (videoId: string, showSubtitleOption: boolean) => void;
}

export const InfiniteFeedMoreOptionsOverlay = forwardRef<
    InfiniteFeedMoreOptionsOverlayHandle,
    InfiniteFeedMoreOptionsOverlayProps
>(function InfiniteFeedMoreOptionsOverlay(
    {
        onAboutAccountPress,
        onDeleteConfirm,
        onEditPress,
        onQrCodePress,
        onSavePress,
        onShowMorePress,
        onSubtitleModeChange,
        onUnfollowPress,
        onWhyThisPostPress,
        subtitleMode,
    },
    ref,
) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const pendingPresentRef = useRef(false);
    const [selection, setSelection] = useState<MoreOptionsSelection | null>(null);
    const [isDeleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);

    useEffect(() => {
        if (!pendingPresentRef.current || !selection) return;
        pendingPresentRef.current = false;
        sheetRef.current?.present();
    }, [selection]);

    useImperativeHandle(ref, () => ({
        close: () => {
            pendingPresentRef.current = false;
            sheetRef.current?.dismiss();
        },
        open: ({ currentUserId, showSubtitleOption, video }) => {
            pendingPresentRef.current = true;
            setDeleteConfirmationVisible(false);
            setSelection({
                creatorUserId: video.user?.id ?? null,
                isFollowingCreator: Boolean(
                    video.user &&
                    video.user.id !== currentUserId &&
                    video.user.isFollowing
                ),
                isOwnVideo: Boolean(currentUserId && video.user?.id === currentUserId),
                showSubtitleOption,
                video,
            });
        },
        updateSubtitleOption: (videoId, showSubtitleOption) => {
            setSelection((prev) => {
                if (!prev || prev.video.id !== videoId || prev.showSubtitleOption === showSubtitleOption) {
                    return prev;
                }
                return {
                    ...prev,
                    showSubtitleOption,
                };
            });
        },
    }), []);

    const handleSave = useCallback(() => {
        if (!selection) return;
        onSavePress(selection.video.id);
    }, [onSavePress, selection]);

    const handleEdit = useCallback(() => {
        if (!selection?.isOwnVideo) return;
        sheetRef.current?.dismiss();
        void onEditPress(selection.video);
    }, [onEditPress, selection]);

    const handleDelete = useCallback(() => {
        if (!selection?.isOwnVideo) return;
        sheetRef.current?.dismiss();
        requestAnimationFrame(() => {
            setDeleteConfirmationVisible(true);
        });
    }, [selection]);

    const handleConfirmDelete = useCallback(() => {
        if (!selection) return;
        onDeleteConfirm(selection.video.id);
        setDeleteConfirmationVisible(false);
        setSelection(null);
    }, [onDeleteConfirm, selection]);

    const handleUnfollow = useCallback(() => {
        if (!selection?.isFollowingCreator) return;
        onUnfollowPress(selection.video.id);
    }, [onUnfollowPress, selection]);

    const handleAboutAccount = useCallback(() => {
        if (!selection?.creatorUserId) return;
        sheetRef.current?.dismiss();
        onAboutAccountPress(selection.creatorUserId);
    }, [onAboutAccountPress, selection]);

    const handleCancelDelete = useCallback(() => {
        setDeleteConfirmationVisible(false);
    }, []);

    return (
        <View style={styles.sheetsContainer} pointerEvents="box-none">
            <InfiniteFeedMoreOptionsSheet
                ref={sheetRef}
                onSavePress={handleSave}
                onQrCodePress={onQrCodePress}
                onEditPress={selection?.isOwnVideo ? handleEdit : undefined}
                onDeletePress={selection?.isOwnVideo ? handleDelete : undefined}
                onUnfollowPress={selection?.isFollowingCreator ? handleUnfollow : undefined}
                onWhyThisPostPress={onWhyThisPostPress}
                onShowMorePress={onShowMorePress}
                onAboutAccountPress={handleAboutAccount}
                showSubtitleOption={Boolean(selection?.showSubtitleOption)}
                subtitleMode={subtitleMode}
                onSubtitleModeChange={onSubtitleModeChange}
                isFollowingCreator={Boolean(selection?.isFollowingCreator)}
            />
            <InfiniteFeedDeleteConfirmationModal
                visible={isDeleteConfirmationVisible}
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    sheetsContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
});
