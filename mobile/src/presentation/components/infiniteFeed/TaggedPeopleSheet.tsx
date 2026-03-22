import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';
import { VerifiedBadge } from '../shared/VerifiedBadge';
import { VideoTaggedPerson } from '../../../domain/entities/Video';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 68;
const HANDLE_SPACE = 24;
const CONTENT_PADDING = 32;
const BOTTOM_BREATHING_ROOM = 12;
const EXTRA_BOTTOM_SAFE_PADDING = 44;

interface TaggedPeopleSheetProps {
    sheetRef: React.RefObject<BottomSheetModal | null> | React.Ref<BottomSheetModal>;
    taggedPeople: VideoTaggedPerson[];
    onClose: () => void;
    onUserPress: (userId: string) => void;
}

export function TaggedPeopleSheet({ sheetRef, taggedPeople, onClose, onUserPress }: TaggedPeopleSheetProps) {
    const insets = useSafeAreaInsets();
    const modalTheme = useSurfaceTheme();

    const snapPoints = useMemo(() => {
        const desiredHeight =
            HEADER_HEIGHT +
            (Math.max(taggedPeople.length, 1) * ROW_HEIGHT) +
            CONTENT_PADDING +
            HANDLE_SPACE +
            insets.bottom +
            BOTTOM_BREATHING_ROOM +
            EXTRA_BOTTOM_SAFE_PADDING;
        const maxHeight = SCREEN_HEIGHT - (insets.top + 60 + 25);

        return [Math.min(desiredHeight, maxHeight)];
    }, [insets.bottom, insets.top, taggedPeople.length]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
                opacity={0.3}
            />
        ),
        []
    );

    const handleUserPress = useCallback((userId: string) => {
        onClose();
        onUserPress(userId);
    }, [onClose, onUserPress]);

    return (
        <BottomSheetModal
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            enableContentPanningGesture
            enableHandlePanningGesture
            onDismiss={onClose}
            backgroundStyle={modalTheme.styles.sheetBackground}
            handleIndicatorStyle={modalTheme.styles.sheetHandle}
        >
            <BottomSheetView style={styles.sheetRoot}>
                <View
                    style={styles.header}
                >
                    <Text style={[styles.title, { color: modalTheme.textPrimary }]}>
                        Gönderide Etiketlenenler
                    </Text>
                </View>

                <BottomSheetScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: 16 + insets.bottom + 12 + EXTRA_BOTTOM_SAFE_PADDING },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {taggedPeople.map((person) => {
                        const hasAvatar = Boolean(person.avatarUrl?.length);
                        const fallbackChar = (person.fullName || person.username || '?').trim().charAt(0).toUpperCase() || '?';

                        return (
                            <Pressable
                                key={person.id}
                                style={styles.userRow}
                                onPress={() => handleUserPress(person.id)}
                                hitSlop={8}
                            >
                                <View
                                    style={[
                                        styles.avatarContainer,
                                        {
                                            backgroundColor: modalTheme.sheetCard,
                                            borderColor: modalTheme.sheetBorder,
                                            borderWidth: modalTheme.separatorWidth,
                                        },
                                    ]}
                                >
                                    {hasAvatar ? (
                                        <Image
                                            source={{ uri: person.avatarUrl }}
                                            style={styles.avatar}
                                            contentFit="cover"
                                            cachePolicy="disk"
                                        />
                                    ) : (
                                        <View style={styles.avatarFallback}>
                                            <Text style={[styles.avatarFallbackText, { color: modalTheme.textPrimary }]}>
                                                {fallbackChar}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.userInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.fullName, { color: modalTheme.textPrimary }]} numberOfLines={1}>
                                            {person.fullName || person.username}
                                        </Text>
                                        {person.isVerified ? (
                                            <View style={styles.verifiedBadge}>
                                                <VerifiedBadge size={16} />
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={[styles.username, { color: modalTheme.textSecondary }]} numberOfLines={1}>
                                        @{person.username || 'user'}
                                    </Text>
                                </View>

                                <ChevronRight
                                    size={18}
                                    color={modalTheme.textSecondary}
                                    strokeWidth={1.8}
                                    style={styles.chevron}
                                />
                            </Pressable>
                        );
                    })}
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    sheetRoot: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    scrollView: {
        paddingBottom: EXTRA_BOTTOM_SAFE_PADDING,
    },
    userRow: {
        minHeight: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackText: {
        fontSize: 18,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullName: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 4,
        flexShrink: 1,
    },
    verifiedBadge: {
        marginLeft: 2,
    },
    username: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 12,
    },
});
