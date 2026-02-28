import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { ArrowLeft, Check, Search, X } from 'lucide-react-native';
import { Avatar } from '../src/presentation/components/shared/Avatar';
import { VerifiedBadge } from '../src/presentation/components/shared/VerifiedBadge';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useProfileSearch } from '../src/presentation/hooks/useProfileSearch';
import { UploadComposerTaggedUser, useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import { DARK_COLORS, LIGHT_COLORS } from '../src/core/constants';
import { formatCount } from '../src/core/utils';
import type { User } from '../src/domain/entities/User';

const RESULT_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 250;
const SELECTED_PANEL_MAX_HEIGHT = 300;

const mapUserToTaggedUser = (user: User): UploadComposerTaggedUser => ({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    followersCount: user.followersCount,
});

export default function TagPeopleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDark = useThemeStore((state) => state.isDark);
    const theme = isDark ? DARK_COLORS : LIGHT_COLORS;
    const [query, setQuery] = useState('');
    const draft = useUploadComposerStore((state) => state.draft);
    const setDraft = useUploadComposerStore((state) => state.setDraft);
    const { results, isLoading, error, search, clear } = useProfileSearch(RESULT_LIMIT);
    const [selectedUsers, setSelectedUsers] = useState<UploadComposerTaggedUser[]>(() => draft?.taggedPeople ?? []);

    const placeholderColor = useMemo(
        () => (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
        [isDark]
    );
    const inputColors = useMemo(
        () => ({
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            iconColor: isDark ? '#FFFFFF' : '#080A0F',
        }),
        [isDark]
    );
    const hasQuery = query.trim().length > 0;

    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed) {
            clear();
            return;
        }

        const timeoutId = setTimeout(() => {
            void search(trimmed);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [clear, query, search]);

    const data = hasQuery ? results : [];
    const isScreenLoading = hasQuery && isLoading;
    const screenError = hasQuery ? error : null;

    const handleAddUser = (user: User) => {
        setSelectedUsers((current) => {
            if (current.some((item) => item.id === user.id)) return current;
            return [...current, mapUserToTaggedUser(user)];
        });
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers((current) => current.filter((item) => item.id !== userId));
    };

    const handleConfirm = () => {
        if (draft) {
            setDraft({
                ...draft,
                taggedPeople: selectedUsers,
            });
        }
        Keyboard.dismiss();
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <SystemBars
                style={{
                    statusBar: isDark ? 'light' : 'dark',
                    navigationBar: isDark ? 'light' : 'dark',
                }}
            />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable
                    style={styles.backButton}
                    onPress={() => {
                        Keyboard.dismiss();
                        router.back();
                    }}
                >
                    <ArrowLeft size={22} color={theme.textPrimary} />
                </Pressable>
                <View
                    style={[
                        styles.headerSearchWrap,
                        {
                            backgroundColor: inputColors.backgroundColor,
                            borderColor: inputColors.borderColor,
                        },
                    ]}
                >
                    <Search size={18} color={inputColors.iconColor} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Bir kullanıcı ara"
                        placeholderTextColor={placeholderColor}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                        autoFocus
                    />
                    {query.length > 0 ? (
                        <Pressable
                            style={styles.clearButton}
                            onPress={() => {
                                setQuery('');
                                Keyboard.dismiss();
                            }}
                        >
                            <X size={16} color={theme.textSecondary} />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            {selectedUsers.length > 0 ? (
                <View style={styles.selectedSheet}>
                    <View style={styles.selectedSheetHeader}>
                        <Text style={[styles.selectedSheetTitle, { color: theme.textPrimary }]}>
                            Etiketlenenler
                        </Text>
                        <Pressable style={styles.selectedSheetAction} onPress={handleConfirm}>
                            <Check size={20} color={theme.textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.selectedSheetList}
                        contentContainerStyle={styles.selectedSheetListContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {selectedUsers.map((user) => (
                            <View key={user.id} style={styles.selectedUserRow}>
                                <View style={styles.selectedUserContent}>
                                    <Avatar url={user.avatarUrl} size={52} />
                                    <View style={styles.selectedUserInfo}>
                                        <View style={styles.nameRow}>
                                            <Text
                                                style={[styles.resultTitle, { color: theme.textPrimary }]}
                                                numberOfLines={1}
                                            >
                                                {user.fullName || user.username}
                                            </Text>
                                            {user.isVerified ? (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={14} />
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text
                                            style={[styles.resultMeta, { color: theme.textSecondary }]}
                                            numberOfLines={1}
                                        >
                                            @{user.username}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    style={styles.selectedUserRemove}
                                    onPress={() => handleRemoveUser(user.id)}
                                >
                                    <X size={16} color="#C7C7CC" />
                                </Pressable>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            ) : null}

            {hasQuery ? (
                <View style={styles.resultsHeader}>
                    <Text style={[styles.selectedSheetTitle, { color: theme.textPrimary }]}>
                        Arama sonuçları
                    </Text>
                </View>
            ) : null}

            {!hasQuery ? (
                <View style={styles.stateContainer} />
            ) : isScreenLoading ? (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                </View>
            ) : screenError ? (
                <View style={styles.stateContainer}>
                    <Text style={[styles.stateText, { color: theme.textSecondary }]}>{screenError}</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Pressable style={styles.resultRow} onPress={() => handleAddUser(item)}>
                            <View style={styles.resultContent}>
                                <Avatar url={item.avatarUrl} size={52} />
                                <View style={styles.resultInfo}>
                                    <View style={styles.nameRow}>
                                        <Text
                                            style={[styles.resultTitle, { color: theme.textPrimary }]}
                                            numberOfLines={1}
                                        >
                                            {item.fullName || item.username}
                                        </Text>
                                        {item.isVerified ? (
                                            <View style={styles.verifiedBadge}>
                                                <VerifiedBadge size={14} />
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text
                                        style={[styles.resultMeta, { color: theme.textSecondary }]}
                                        numberOfLines={1}
                                    >
                                        @{item.username}
                                    </Text>
                                    {typeof item.followersCount === 'number' && item.followersCount >= 1000 ? (
                                        <View style={styles.statsRow}>
                                            <Text style={[styles.statText, { color: theme.textSecondary }]}>
                                                {formatCount(item.followersCount)} takipci
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </Pressable>
                    )}
                    contentContainerStyle={[
                        styles.resultsContent,
                        { paddingBottom: insets.bottom + 24 },
                        data.length === 0 && styles.resultsContentEmpty,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <View style={styles.stateContainer}>
                            <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                                {hasQuery ? 'Sonuc bulunamadi.' : 'Gosterilecek kullanici bulunamadi.'}
                            </Text>
                        </View>
                    }
                />
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSearchWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 40,
        gap: 10,
        marginLeft: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
    },
    clearButton: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
    resultsContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    resultsContentEmpty: {
        flexGrow: 1,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    resultContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    resultInfo: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    resultTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    resultMeta: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: -2,
    },
    verifiedBadge: {
        marginLeft: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        fontSize: 12,
        fontWeight: '500',
    },
    stateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 12,
    },
    stateText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    selectedSheet: {
        marginTop: 4,
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 4,
    },
    selectedSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    selectedSheetTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    selectedSheetAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedSheetList: {
        flexGrow: 0,
        maxHeight: SELECTED_PANEL_MAX_HEIGHT,
    },
    selectedSheetListContent: {
        paddingBottom: 2,
    },
    selectedUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        gap: 12,
    },
    selectedUserContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectedUserInfo: {
        flex: 1,
        gap: 2,
    },
    selectedUserRemove: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsHeader: {
        paddingHorizontal: 16,
        paddingTop: 2,
        paddingBottom: 4,
    },
});
