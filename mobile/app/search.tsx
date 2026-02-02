import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, FlatList, ActivityIndicator, Keyboard, BackHandler, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { ArrowLeft, Search, X, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import VideoPlayer from 'react-native-video';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useProfileSearch } from '../src/presentation/hooks/useProfileSearch';
import { useVideoSearch } from '../src/presentation/hooks/useVideoSearch';
import { Avatar } from '../src/presentation/components/shared/Avatar';
import { VerifiedBadge } from '../src/presentation/components/shared/VerifiedBadge';
import { VideoTabIcon } from '../src/presentation/components/shared/VideoTabIcon';
import { DARK_COLORS, LIGHT_COLORS } from '../src/core/constants';
import { formatCount } from '../src/core/utils';
import { getVideoUrl } from '../src/core/utils/videoUrl';
import { User } from '../src/domain/entities/User';
import { Video as VideoEntity } from '../src/domain/entities/Video';

const RECENT_KEY = 'search.recent.users';
const MAX_RECENT = 10;
const MIN_QUERY_LENGTH = 1;
const RESULT_LIMIT = 30;
const POST_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 350;

type RecentUser = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'isVerified' | 'followersCount'>;
type RecentItem = { type: 'query'; value: string } | { type: 'user'; user: RecentUser };
type SuggestionItem = { type: 'query'; value: string } | { type: 'user'; user: User };
const TABS = ['Senin İçin', 'Hesaplar', 'Kişiselleştirilmemiş', 'Etiketler', 'Yerder'] as const;
type SearchTab = typeof TABS[number];

const resolvePostMedia = (post: VideoEntity) => {
    const media = post.mediaUrls ?? [];
    const imageUrl =
        media.find((item) => item.type === 'image' && typeof item.url === 'string')?.url ||
        post.thumbnailUrl ||
        null;
    const videoUrl =
        getVideoUrl(post) ||
        media.find((item) => item.type === 'video' && typeof item.url === 'string')?.url ||
        null;

    return {
        imageUrl,
        videoUrl,
        isVideo: Boolean(videoUrl),
    };
};

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDark = useThemeStore((state) => state.isDark);
    const theme = isDark ? DARK_COLORS : LIGHT_COLORS;
    const [query, setQuery] = useState('');
    const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedTab, setSelectedTab] = useState<SearchTab>('Senin İçin');
    const [isCommittedSearch, setIsCommittedSearch] = useState(false);
    const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
    const { width: windowWidth } = useWindowDimensions();
    const postTileWidth = (windowWidth - 1) / 2;

    const { results, isLoading, error, search, clear } = useProfileSearch(RESULT_LIMIT);
    const { results: postResults, isLoading: isPostsLoading, error: postsError, search: searchPosts, clear: clearPosts } = useVideoSearch(POST_LIMIT);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const videoIndices = useMemo(
        () =>
            postResults.reduce<number[]>((acc, post, index) => {
                if (resolvePostMedia(post).isVideo) {
                    acc.push(index);
                }
                return acc;
            }, []),
        [postResults]
    );

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
        }, [isDark])
    );

    useEffect(() => {
        const onBackPress = () => {
            if (isCommittedSearch) {
                setIsCommittedSearch(false);
                return true;
            }
            return false;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [isCommittedSearch]);

    useEffect(() => {
        let isMounted = true;
        const loadRecent = async () => {
            try {
                const stored = await AsyncStorage.getItem(RECENT_KEY);
                if (!stored || !isMounted) return;
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    const cleaned: RecentItem[] = parsed
                        .map((item) => {
                            if (item && typeof item === 'object' && item.type === 'query' && typeof item.value === 'string') {
                                return { type: 'query', value: item.value };
                            }
                            if (item && typeof item === 'object' && item.type === 'user' && item.user && typeof item.user.id === 'string') {
                                const user = item.user;
                                return {
                                    type: 'user' as const,
                                    user: {
                                        id: user.id,
                                        username: user.username,
                                        fullName: user.fullName,
                                        avatarUrl: user.avatarUrl,
                                        isVerified: user.isVerified,
                                        followersCount: user.followersCount,
                                    },
                                };
                            }
                            return null;
                        })
                        .filter(Boolean)
                        .slice(0, MAX_RECENT) as RecentItem[];
                    setRecentItems(cleaned);
                }
            } catch {
                // ignore malformed storage
            }
        };
        loadRecent();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const trimmed = query.trim();
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (trimmed.length < MIN_QUERY_LENGTH) {
            clear();
            clearPosts();
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            search(trimmed);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [query, search, clear, clearPosts]);

    useEffect(() => {
        if (!isCommittedSearch || selectedTab !== 'Senin İçin' || videoIndices.length === 0) {
            setActivePostIndex(null);
            return;
        }
        setActivePostIndex((prev) => (prev !== null && videoIndices.includes(prev) ? prev : videoIndices[0]));
    }, [isCommittedSearch, selectedTab, videoIndices]);

    useEffect(() => {
        if (!isCommittedSearch || selectedTab !== 'Senin İçin') return;
        if (activePostIndex === null || !videoIndices.includes(activePostIndex)) return;
        const timer = setTimeout(() => {
            const currentIndex = videoIndices.indexOf(activePostIndex);
            const nextIndex = videoIndices[(currentIndex + 1) % videoIndices.length];
            setActivePostIndex(nextIndex);
        }, 5000);
        return () => clearTimeout(timer);
    }, [isCommittedSearch, selectedTab, activePostIndex, videoIndices]);


    const placeholderColor = useMemo(
        () => (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
        [isDark]
    );

    const inputColors = useMemo(
        () => ({
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            iconColor: isDark ? '#FFFFFF' : '#000000',
        }),
        [isDark]
    );

    const hasQuery = query.trim().length > 0;
    const shouldSearch = query.trim().length >= MIN_QUERY_LENGTH;

    const handleBack = () => {
        if (isCommittedSearch) {
            setIsCommittedSearch(false);
            return;
        }
        router.back();
    };

    const addRecentUser = useCallback((user: RecentUser | User) => {
        if (!user?.id) return;
        const nextUser: RecentUser = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified,
            followersCount: user.followersCount,
        };
        setRecentItems((prev) => {
            const filtered = prev.filter((item) => !(item.type === 'user' && item.user.id === user.id));
            const next: RecentItem[] = [{ type: 'user', user: nextUser }, ...filtered].slice(0, MAX_RECENT);
            AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => { });
            return next;
        });
    }, []);

    const addRecentQuery = useCallback((value: string) => {
        const normalized = value.trim();
        if (!normalized) return;
        setRecentItems((prev) => {
            const filtered = prev.filter((item) => !(item.type === 'query' && item.value.toLowerCase() === normalized.toLowerCase()));
            const next: RecentItem[] = [{ type: 'query', value: normalized }, ...filtered].slice(0, MAX_RECENT);
            AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => { });
            return next;
        });
    }, []);

    const clearRecent = useCallback(() => {
        setRecentItems([]);
        AsyncStorage.removeItem(RECENT_KEY).catch(() => { });
    }, []);

    const handleClear = () => {
        setQuery('');
        clear();
        clearPosts();
        setIsCommittedSearch(false);
    };

    const handleSubmit = () => {
        const trimmed = query.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) return;
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        setIsCommittedSearch(true);
        setSelectedTab('Senin İçin');
        search(trimmed);
        clearPosts();
        searchPosts(trimmed);
        addRecentQuery(trimmed);
        Keyboard.dismiss();
    };

    const handleRemoveRecent = (item: RecentItem) => {
        setRecentItems((prev) => {
            const next = prev.filter((entry) => {
                if (item.type === 'query') {
                    return !(entry.type === 'query' && entry.value === item.value);
                }
                return !(entry.type === 'user' && entry.user.id === item.user.id);
            });
            AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => { });
            return next;
        });
    };

    const displayResults = useMemo(() => {
        const followed = results.filter((item) => item.isFollowing);
        const others = results.filter((item) => !item.isFollowing);
        return [...followed, ...others];
    }, [results]);

    const forYouResults = useMemo(() => displayResults.slice(0, 5), [displayResults]);

    const suggestionResults = useMemo<SuggestionItem[]>(() => {
        const followed = results.filter((item) => item.isFollowing);
        const others = results.filter((item) => !item.isFollowing);
        const trimmed = query.trim();
        const queryItem = trimmed.length > 0 ? [{ type: 'query' as const, value: trimmed }] : [];
        return [
            ...followed.map((user) => ({ type: 'user' as const, user })),
            ...queryItem,
            ...others.map((user) => ({ type: 'user' as const, user })),
        ];
    }, [query, results]);

    const handleOpenProfile = useCallback((user: RecentUser | User) => {
        addRecentUser(user);
        if (query.trim().length > 0) {
            addRecentQuery(query);
        }
        if (currentUserId && user.id === currentUserId) {
            router.push('/profile');
            return;
        }
        router.push(`/user/${user.id}` as any);
    }, [addRecentQuery, addRecentUser, currentUserId, query, router]);

    const renderUserRow = (user: RecentUser | User) => (
        <View style={styles.resultRow}>
            <Pressable style={styles.resultContent} onPress={() => handleOpenProfile(user)}>
                <Avatar url={user.avatarUrl} size={52} />
                <View style={styles.resultInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {user.fullName || user.username}
                        </Text>
                        {user.isVerified ? (
                            <View style={styles.verifiedBadge}>
                                <VerifiedBadge size={14} />
                            </View>
                        ) : null}
                    </View>
                    <Text style={[styles.resultMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                        @{user.username}
                    </Text>
                    {typeof user.followersCount === 'number' && user.followersCount >= 1000 && (
                        <View style={styles.statsRow}>
                            <Text style={[styles.statText, { color: theme.textSecondary }]}>
                                {formatCount(user.followersCount)} takipci
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );

    const renderResultItem = ({ item }: { item: User }) => renderUserRow(item);

    const renderSuggestionItem = ({ item }: { item: SuggestionItem }) => {
        if (item.type === 'query') {
            return (
                <View style={styles.resultRow}>
                    <Pressable
                        style={styles.resultContent}
                        onPress={() => {
                            setSelectedTab('Senin İçin');
                            setIsCommittedSearch(true);
                            addRecentQuery(item.value);
                            search(item.value);
                            clearPosts();
                            searchPosts(item.value);
                            Keyboard.dismiss();
                        }}
                    >
                        <View style={[styles.searchBubble, { backgroundColor: inputColors.backgroundColor }]}>
                            <Search size={18} color={inputColors.iconColor} />
                        </View>
                        <View style={styles.resultInfo}>
                            <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                {item.value}
                            </Text>
                        </View>
                    </Pressable>
                </View>
            );
        }
        return renderUserRow(item.user);
    };

    const renderRecentItem = ({ item }: { item: RecentItem }) => {
        if (item.type === 'query') {
            return (
                <View style={styles.resultRow}>
                    <Pressable style={styles.resultContent} onPress={() => {
                        setQuery(item.value);
                        setSelectedTab('Senin İçin');
                        setIsCommittedSearch(true);
                        addRecentQuery(item.value);
                        search(item.value);
                        clearPosts();
                        searchPosts(item.value);
                        Keyboard.dismiss();
                    }}>
                        <View style={[styles.searchBubble, { backgroundColor: inputColors.backgroundColor }]}>
                            <Clock size={18} color={inputColors.iconColor} />
                        </View>
                        <View style={styles.resultInfo}>
                            <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                {item.value}
                            </Text>
                        </View>
                    </Pressable>
                    <Pressable style={styles.removeButton} onPress={() => handleRemoveRecent(item)} hitSlop={10}>
                        <X size={16} color={theme.textSecondary} />
                    </Pressable>
                </View>
            );
        }

        const user = item.user;
        return (
            <View style={styles.resultRow}>
                <Pressable style={styles.resultContent} onPress={() => handleOpenProfile(user)}>
                    <Avatar url={user.avatarUrl} size={52} />
                    <View style={styles.resultInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                {user.fullName || user.username}
                            </Text>
                            {user.isVerified ? (
                                <View style={styles.verifiedBadge}>
                                    <VerifiedBadge size={14} />
                                </View>
                            ) : null}
                        </View>
                        <Text style={[styles.resultMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                            @{user.username}
                        </Text>
                        {typeof user.followersCount === 'number' && user.followersCount >= 1000 && (
                            <View style={styles.statsRow}>
                                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                                    {formatCount(user.followersCount)} takipci
                                </Text>
                            </View>
                        )}
                    </View>
                </Pressable>
                <Pressable style={styles.removeButton} onPress={() => handleRemoveRecent(item)} hitSlop={10}>
                    <X size={16} color={theme.textSecondary} />
                </Pressable>
            </View>
        );
    };

    const renderPostTile = (post: VideoEntity, index: number) => {
        const media = resolvePostMedia(post);
        const isActiveVideo = media.isVideo && index === activePostIndex;

        return (
            <View
                key={post.id}
                style={[
                    styles.postTile,
                    {
                        width: postTileWidth,
                        marginRight: index % 2 === 0 ? 1 : 0,
                        marginBottom: 1,
                    },
                ]}
            >
                {isActiveVideo && media.videoUrl ? (
                    <VideoPlayer
                        source={{ uri: media.videoUrl }}
                        style={styles.postTileImage}
                        paused={false}
                        muted
                        volume={0}
                        repeat={false}
                        resizeMode="cover"
                        playInBackground={false}
                        playWhenInactive={false}
                    />
                ) : media.imageUrl ? (
                    <Image source={{ uri: media.imageUrl }} style={styles.postTileImage} contentFit="cover" />
                ) : (
                    <View style={[styles.postTileImage, styles.postTileFallback]} />
                )}
                {media.isVideo ? (
                    <View style={styles.postOverlay}>
                        <VideoTabIcon color="#FFFFFF" size={24} />
                        <Text style={styles.postOverlayText}>{formatCount(post.viewsCount ?? 0)}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    const ResultsHeader = () => (
        isLoading ? (
            <View style={styles.resultsHeader}>
                <ActivityIndicator size="small" color={theme.textPrimary} />
            </View>
        ) : null
    );

    const ResultsEmpty = () => {
        if (isLoading) return null;
        if (error) {
            return (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Arama hatasi</Text>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
                    <Pressable style={[styles.retryButton, { borderColor: theme.textPrimary }]} onPress={handleSubmit}>
                        <Text style={[styles.retryText, { color: theme.textPrimary }]}>Tekrar dene</Text>
                    </Pressable>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}> 
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
                <Pressable style={styles.backButton} onPress={handleBack}> 
                    <ArrowLeft size={22} color={theme.textPrimary} />
                </Pressable>
                <View style={[styles.headerSearchWrap, { backgroundColor: inputColors.backgroundColor, borderColor: inputColors.borderColor }]}> 
                    <Search size={18} color={inputColors.iconColor} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Ara"
                        placeholderTextColor={placeholderColor}
                        value={query}
                        onChangeText={(text) => {
                            setIsCommittedSearch(false);
                            setQuery(text);
                        }}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                        onSubmitEditing={handleSubmit}
                        clearButtonMode="while-editing"
                        autoFocus
                    />
                    {query.length > 0 && (
                        <Pressable style={styles.clearButton} onPress={handleClear}>
                            <X size={16} color={theme.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {!hasQuery && (
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
                    keyboardShouldPersistTaps="handled"
                >
                    {recentItems.length > 0 ? (
                        <>
                            <View style={styles.sectionHeader}> 
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Yakındakiler</Text>
                                <Pressable onPress={clearRecent}>
                                    <Text style={[styles.clearText, { color: theme.textSecondary }]}>Temizle</Text>
                                </Pressable>
                            </View>
                            <View>
                                {recentItems.map((item, index) => (
                                    <View key={item.type === 'query' ? `q-${item.value}-${index}` : item.user.id}>
                                        {renderRecentItem({ item })}
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            )}

            {shouldSearch && !isCommittedSearch && (
                <FlatList
                    data={suggestionResults}
                    keyExtractor={(item, index) => (item.type === 'query' ? `query-${item.value}` : item.user.id + index)}
                    renderItem={renderSuggestionItem}
                    contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                />
            )}

            {shouldSearch && isCommittedSearch && (
                <>
                    <View style={[styles.tabBarWrapper, { borderBottomColor: inputColors.borderColor }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabBar}
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            directionalLockEnabled
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                        >
                            {TABS.map((tab) => {
                                const isActive = tab === selectedTab;
                                return (
                                    <Pressable
                                        key={tab}
                                        style={[
                                            styles.tabItem,
                                            isActive && [styles.activeTab, { borderBottomColor: theme.textPrimary }],
                                        ]}
                                        onPress={() => setSelectedTab(tab)}
                                    >
                                        <Text style={[styles.tabText, { color: isActive ? theme.textPrimary : theme.textSecondary }]}>
                                            {tab}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                    {selectedTab === 'Senin İçin' && (
                        <FlatList
                            data={forYouResults}
                            keyExtractor={(item) => item.id}
                            renderItem={renderResultItem}
                            contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]}
                            ListHeaderComponent={
                                <>
                                    {forYouResults.length > 0 ? (
                                        <Text style={[styles.sectionTitle, styles.sectionTitleSpacing, { color: theme.textPrimary }]}>Hesaplar</Text>
                                    ) : null}
                                    <ResultsHeader />
                                </>
                            }
                            ListFooterComponent={
                                <View>
                                    <View style={styles.sectionSpacer} />
                                    {isPostsLoading ? (
                                        <ActivityIndicator size="small" color={theme.textPrimary} />
                                    ) : postsError ? null : postResults.length > 0 ? (
                                        <>
                                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Gönderiler</Text>
                                            <View style={styles.sectionSpacer} />
                                            <View style={[styles.postGrid, { width: windowWidth, marginLeft: -16 }]}>
                                                {postResults.map((post, index) => renderPostTile(post, index))}
                                            </View>
                                        </>
                                    ) : null}
                                </View>
                            }
                            ListEmptyComponent={ResultsEmpty}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                    {selectedTab === 'Hesaplar' && (
                        <FlatList
                            data={displayResults}
                            keyExtractor={(item) => item.id}
                            renderItem={renderResultItem}
                            contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]}
                            ListHeaderComponent={ResultsHeader}
                            ListEmptyComponent={ResultsEmpty}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                    {selectedTab !== 'Senin İçin' && selectedTab !== 'Hesaplar' && (
                        <View style={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]} />
                    )}
                </>
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
    content: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    sectionTitleSpacing: {
        marginBottom: 16,
    },
    sectionSpacer: {
        height: 16,
    },
    clearText: {
        fontSize: 13,
        fontWeight: '500',
    },
    resultsContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    resultsHeader: {
        paddingVertical: 8,
    },
    tabBarWrapper: {
        borderBottomWidth: 1,
        marginTop: 8,
    },
    tabBar: {
        paddingHorizontal: 16,
        gap: 18,
        paddingBottom: 0,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    activeTab: {
        borderBottomWidth: 2,
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
    searchBubble: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
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
    removeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    postGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    postTile: {
        alignItems: 'stretch',
        position: 'relative',
    },
    postTileImage: {
        width: '100%',
        aspectRatio: 4 / 5,
    },
    postTileFallback: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    postOverlay: {
        position: 'absolute',
        left: 6,
        bottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    postOverlayText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 13,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
    },
    retryText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
