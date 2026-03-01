import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, FlatList, Keyboard, BackHandler, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { ArrowLeft, Search, X, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import VideoPlayer from 'react-native-video';
import CarouselMediaIcon from '../assets/icons/carousel.svg';
import VideoMediaIcon from '../assets/icons/videos.svg';
import { VideoCacheService } from '../src/data/services/VideoCacheService';
import { SupabaseVideoDataSource } from '../src/data/datasources/SupabaseVideoDataSource';
import { supabase } from '../src/core/supabase';
import { Hash } from 'lucide-react-native';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useProfileSearch } from '../src/presentation/hooks/useProfileSearch';
import { useVideoSearch } from '../src/presentation/hooks/useVideoSearch';
import { Avatar } from '../src/presentation/components/shared/Avatar';
import { VerifiedBadge } from '../src/presentation/components/shared/VerifiedBadge';
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
const POST_GRID_GAP = 2;
const DISCOVERY_ICON_SIZE = 22;
const DISCOVERY_ICON_BG_SIZE = 28;

type RecentUser = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'isVerified' | 'followersCount'>;
type RecentItem = { type: 'query'; value: string } | { type: 'user'; user: RecentUser };
type SuggestionItem = { type: 'query'; value: string } | { type: 'user'; user: User };
type HashtagResult = { id: string; name: string; post_count: number; click_count: number; search_count: number; score: number };
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

const resolvePostMediaType = (post: VideoEntity): 'carousel' | 'video' | 'photo' => {
    const media = post.mediaUrls ?? [];
    const hasVideoMedia = media.some((item) => item.type === 'video');
    const fallbackVideoUrl = getVideoUrl(post);
    const isCarousel = post.postType === 'carousel';
    const isVideo = !isCarousel && (hasVideoMedia || Boolean(fallbackVideoUrl));

    return isCarousel ? 'carousel' : isVideo ? 'video' : 'photo';
};

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ q?: string }>();
    const isDark = useThemeStore((state) => state.isDark);
    const theme = isDark ? DARK_COLORS : LIGHT_COLORS;
    const [query, setQuery] = useState(params.q ?? '');
    const [committedQuery, setCommittedQuery] = useState('');
    const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastProfileQueryRef = useRef<string>('');
    const lastPostQueryRef = useRef<string>('');
    const [selectedTab, setSelectedTab] = useState<SearchTab>('Senin İçin');
    const [isCommittedSearch, setIsCommittedSearch] = useState(false);
    const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
    const [videoSources, setVideoSources] = useState<Record<string, { uri: string }>>({});
    const [readyVideoIds, setReadyVideoIds] = useState<Record<string, boolean>>({});
    const [scrollY, setScrollY] = useState(0);
    const [listHeight, setListHeight] = useState(0);
    const [footerOffsetY, setFooterOffsetY] = useState(0);
    const [gridLocalY, setGridLocalY] = useState(0);
    const [tileLayouts, setTileLayouts] = useState<Record<string, { y: number; height: number }>>({});
    const { width: windowWidth } = useWindowDimensions();
    const postTileWidth = (windowWidth - POST_GRID_GAP) / 2;

    const { results, isLoading, error, search, clear } = useProfileSearch(RESULT_LIMIT);
    const { results: postResults, isLoading: isPostsLoading, error: postsError, search: searchPosts, clear: clearPosts } = useVideoSearch(POST_LIMIT);
    const [hashtagResults, setHashtagResults] = useState<HashtagResult[]>([]);
    const [isHashtagsLoading, setIsHashtagsLoading] = useState(false);
    const [isHashtagDiscovery, setIsHashtagDiscovery] = useState(false);
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
    const gridOffsetY = footerOffsetY + gridLocalY;
    const visibleIndices = useMemo(() => {
        if (!listHeight) return [];
        const top = scrollY;
        const bottom = scrollY + listHeight;
        const visible: number[] = [];
        postResults.forEach((post, index) => {
            const layout = tileLayouts[post.id];
            if (!layout) return;
            const y = gridOffsetY + layout.y;
            if (y + layout.height > top && y < bottom) {
                visible.push(index);
            }
        });
        return visible;
    }, [gridOffsetY, listHeight, postResults, scrollY, tileLayouts]);
    const visibleVideoIndices = useMemo(() => {
        if (!visibleIndices.length) return [];
        const visibleSet = new Set(visibleIndices);
        return videoIndices.filter((index) => visibleSet.has(index));
    }, [videoIndices, visibleIndices]);

    const runProfileSearch = useCallback(
        (value: string, options?: { force?: boolean }) => {
            const trimmed = value.trim();
            if (trimmed.length < MIN_QUERY_LENGTH) return;
            if (!options?.force && trimmed === lastProfileQueryRef.current) return;
            lastProfileQueryRef.current = trimmed;
            search(trimmed);
        },
        [search]
    );

    const runPostSearch = useCallback(
        (value: string, options?: { force?: boolean }) => {
            const trimmed = value.trim();
            if (trimmed.length < MIN_QUERY_LENGTH) return;
            if (!options?.force && trimmed === lastPostQueryRef.current) return;
            lastPostQueryRef.current = trimmed;
            clearPosts();
            searchPosts(trimmed);
        },
        [clearPosts, searchPosts]
    );

    const searchHashtags = useCallback(async (value: string) => {
        const trimmed = value.trim().replace(/^#/, '');
        if (!trimmed) {
            setHashtagResults([]);
            return;
        }
        setIsHashtagsLoading(true);
        try {
            const { data, error: hashErr } = await supabase
                .from('hashtags')
                .select('id, name, click_count, search_count')
                .ilike('name', `%${trimmed}%`)
                .order('click_count', { ascending: false })
                .limit(30);

            if (hashErr || !data) {
                setHashtagResults([]);
                return;
            }

            // Count posts per hashtag
            const hashtagIds = data.map((h: any) => h.id);
            const { data: countData } = await supabase
                .from('video_hashtags')
                .select('hashtag_id')
                .in('hashtag_id', hashtagIds);

            const postCounts: Record<string, number> = {};
            (countData ?? []).forEach((row: any) => {
                postCounts[row.hashtag_id] = (postCounts[row.hashtag_id] || 0) + 1;
            });

            const mapped: HashtagResult[] = data.map((h: any) => {
                const postCount = postCounts[h.id] || 0;
                return {
                    id: h.id,
                    name: h.name,
                    post_count: postCount,
                    click_count: h.click_count || 0,
                    search_count: h.search_count || 0,
                    score: postCount * 1.0 + (h.click_count || 0) * 0.5 + (h.search_count || 0) * 0.3,
                };
            });
            mapped.sort((a, b) => b.score - a.score);
            setHashtagResults(mapped);
        } catch {
            setHashtagResults([]);
        } finally {
            setIsHashtagsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
        }, [isDark])
    );

    useEffect(() => {
        VideoCacheService.initialize();
    }, []);

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
                                return { type: 'query' as const, value: item.value };
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
            lastProfileQueryRef.current = '';
            lastPostQueryRef.current = '';
            setCommittedQuery('');
            clear();
            clearPosts();
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            runProfileSearch(trimmed);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [query, clear, clearPosts, runProfileSearch]);

    useEffect(() => {
        setVideoSources({});
        setReadyVideoIds({});
        setTileLayouts({});
    }, [postResults]);

    useEffect(() => {
        if (!isCommittedSearch || selectedTab !== 'Senin İçin' || visibleVideoIndices.length === 0) {
            setActivePostIndex(null);
            return;
        }
        setActivePostIndex((prev) => (prev !== null && visibleVideoIndices.includes(prev) ? prev : visibleVideoIndices[0]));
    }, [isCommittedSearch, selectedTab, visibleVideoIndices]);

    useEffect(() => {
        if (!isCommittedSearch || selectedTab !== 'Senin İçin') return;
        if (activePostIndex === null || !visibleVideoIndices.includes(activePostIndex)) return;
        const timer = setTimeout(() => {
            const currentIndex = visibleVideoIndices.indexOf(activePostIndex);
            const nextIndex = visibleVideoIndices[(currentIndex + 1) % visibleVideoIndices.length];
            setActivePostIndex(nextIndex);
        }, 5000);
        return () => clearTimeout(timer);
    }, [isCommittedSearch, selectedTab, activePostIndex, visibleVideoIndices]);

    useEffect(() => {
        const activePost = activePostIndex !== null ? postResults[activePostIndex] : null;
        if (!activePost) return;
        const media = resolvePostMedia(activePost);
        if (!media.videoUrl) return;

        let isCancelled = false;
        const loadSource = async () => {
            const cachedPath = await VideoCacheService.getCachedVideoPath(media.videoUrl!);
            if (isCancelled) return;
            setVideoSources((prev) => {
                const nextUri = cachedPath || media.videoUrl!;
                if (prev[activePost.id]?.uri === nextUri) return prev;
                return { ...prev, [activePost.id]: { uri: nextUri } };
            });

            if (!cachedPath) {
                VideoCacheService.cacheVideo(media.videoUrl!).then((newPath) => {
                    if (isCancelled || !newPath) return;
                    setVideoSources((prev) => ({ ...prev, [activePost.id]: { uri: newPath } }));
                });
            }
        };

        loadSource();
        return () => {
            isCancelled = true;
        };
    }, [activePostIndex, postResults]);


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
    const shouldSearch = query.trim().length >= MIN_QUERY_LENGTH;
    const searchLabel = (committedQuery || query).trim();
    const searchingText = searchLabel ? `"${searchLabel}" aranıyor...` : 'Aranıyor...';

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
            const next: RecentItem[] = [{ type: 'user' as const, user: nextUser }, ...filtered].slice(0, MAX_RECENT);
            AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => { });
            return next;
        });
    }, []);

    const addRecentQuery = useCallback((value: string) => {
        const normalized = value.trim();
        if (!normalized) return;
        setRecentItems((prev) => {
            const filtered = prev.filter((item) => !(item.type === 'query' && item.value.toLowerCase() === normalized.toLowerCase()));
            const next: RecentItem[] = [{ type: 'query' as const, value: normalized }, ...filtered].slice(0, MAX_RECENT);
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
        setCommittedQuery('');
        lastProfileQueryRef.current = '';
        lastPostQueryRef.current = '';
        clear();
        clearPosts();
        setHashtagResults([]);
        setIsHashtagDiscovery(false);
        setIsCommittedSearch(false);
    };

    const hashtagTrackingRef = useRef<SupabaseVideoDataSource | null>(null);

    const commitSearch = useCallback(
        (value: string, options?: { force?: boolean }) => {
            const trimmed = value.trim();
            if (trimmed.length < MIN_QUERY_LENGTH) return;
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            setIsCommittedSearch(true);
            setCommittedQuery(trimmed);
            addRecentQuery(trimmed);
            Keyboard.dismiss();

            const isHashtagQuery = trimmed.startsWith('#');

            if (isHashtagQuery) {
                // Phase 1: Only search hashtags, no tabs
                setIsHashtagDiscovery(true);
                searchHashtags(trimmed);
                // Don't run profile/post search yet
            } else {
                // Normal search: run all searches
                setIsHashtagDiscovery(false);
                setSelectedTab('Senin İçin');
                const forceProfile = options?.force || Boolean(error);
                const forcePosts = options?.force || Boolean(postsError);
                runProfileSearch(trimmed, forceProfile ? { force: true } : undefined);
                runPostSearch(trimmed, forcePosts ? { force: true } : undefined);
                searchHashtags(trimmed);
            }

            // Track hashtag searches
            const hashtagMatches = trimmed.match(/#([^\s#]+)/g);
            if (hashtagMatches) {
                if (!hashtagTrackingRef.current) hashtagTrackingRef.current = new SupabaseVideoDataSource();
                hashtagMatches.forEach((tag) => {
                    hashtagTrackingRef.current!.incrementHashtagSearch(tag.replace(/^#/, ''));
                });
            }
        },
        [addRecentQuery, error, postsError, runPostSearch, runProfileSearch, searchHashtags]
    );

    // Phase 2: User picks a hashtag from discovery → full tabbed search
    const commitHashtagFullSearch = useCallback(
        (hashtagName: string) => {
            const tagQuery = `#${hashtagName}`;
            setQuery(tagQuery);
            setCommittedQuery(tagQuery);
            setIsHashtagDiscovery(false);
            setIsCommittedSearch(true);
            setSelectedTab('Senin İçin');

            // Search posts containing this hashtag
            runPostSearch(tagQuery, { force: true });
            // Search users by the keyword (without #)
            runProfileSearch(hashtagName, { force: true });
            // Search related hashtags
            searchHashtags(tagQuery);

            // Track click
            if (!hashtagTrackingRef.current) hashtagTrackingRef.current = new SupabaseVideoDataSource();
            hashtagTrackingRef.current.incrementHashtagClick(hashtagName);
        },
        [runPostSearch, runProfileSearch, searchHashtags]
    );

    const initialQueryHandled = useRef(false);
    useEffect(() => {
        if (!initialQueryHandled.current && params.q) {
            initialQueryHandled.current = true;
            commitSearch(params.q);
        }
    }, [params.q, commitSearch]);

    const handleSubmit = () => {
        commitSearch(query);
    };

    const handleRetry = () => {
        commitSearch(query, { force: true });
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
                            commitSearch(item.value);
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
                        commitSearch(item.value);
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
        const mediaType = resolvePostMediaType(post);
        const isActiveVideo = media.isVideo && index === activePostIndex;
        const source = isActiveVideo && media.videoUrl ? (videoSources[post.id] ?? { uri: media.videoUrl }) : null;
        const isReady = readyVideoIds[post.id] === true;

        return (
            <View
                key={post.id}
                style={[
                    styles.postTile,
                    {
                        width: postTileWidth,
                        marginRight: index % 2 === 0 ? POST_GRID_GAP : 0,
                        marginBottom: POST_GRID_GAP,
                    },
                ]}
                onLayout={(event) => {
                    const { y, height } = event.nativeEvent.layout;
                    setTileLayouts((prev) => {
                        const current = prev[post.id];
                        if (current && current.y === y && current.height === height) return prev;
                        return { ...prev, [post.id]: { y, height } };
                    });
                }}
            >
                <View style={styles.postMedia}>
                    {media.imageUrl ? (
                        <Image source={{ uri: media.imageUrl }} style={styles.postMediaFill} contentFit="cover" />
                    ) : (
                        <View style={[styles.postMediaFill, styles.postMediaFallback]} />
                    )}
                    {isActiveVideo && media.videoUrl && source ? (
                        <VideoPlayer
                            source={source}
                            style={[styles.postMediaFill, { opacity: isReady ? 1 : 0 }]}
                            paused={false}
                            muted
                            volume={0}
                            repeat={false}
                            resizeMode="cover"
                            playInBackground={false}
                            playWhenInactive={false}
                            onReadyForDisplay={() => {
                                setReadyVideoIds((prev) => (prev[post.id] ? prev : { ...prev, [post.id]: true }));
                            }}
                        />
                    ) : null}
                </View>
                {mediaType !== 'photo' ? (
                    <View style={styles.postOverlay}>
                        <View style={styles.postOverlayBubble}>
                            {mediaType === 'video' ? (
                                <VideoMediaIcon width={DISCOVERY_ICON_SIZE} height={DISCOVERY_ICON_SIZE} />
                            ) : (
                                <CarouselMediaIcon width={DISCOVERY_ICON_SIZE} height={DISCOVERY_ICON_SIZE} />
                            )}
                        </View>
                    </View>
                ) : null}
            </View>
        );
    };

    const ResultsEmpty = () => {
        if (isLoading) return null;
        if (error) {
            return (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Arama hatasi</Text>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
                    <Pressable style={[styles.retryButton, { borderColor: theme.textPrimary }]} onPress={handleRetry}>
                        <Text style={[styles.retryText, { color: theme.textPrimary }]}>Tekrar dene</Text>
                    </Pressable>
                </View>
            );
        }
        return null;
    };

    const AccountsHeader = () => {
        if (isLoading) {
            return (
                <View style={[styles.loadingHeaderRow, styles.sectionTitleSpacing]}>
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                    <Text style={[styles.sectionTitle, styles.loadingHeaderText, { color: theme.textSecondary }]}>
                        {searchingText}
                    </Text>
                </View>
            );
        }
        if (forYouResults.length > 0) {
            return (
                <Text style={[styles.sectionTitle, styles.sectionTitleSpacing, { color: theme.textPrimary }]}>Hesaplar</Text>
            );
        }
        return null;
    };

    const PostsHeader = () => {
        if (!isLoading && isPostsLoading) {
            return (
                <View style={[styles.loadingHeaderRow, styles.sectionTitleSpacing]}>
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                    <Text style={[styles.sectionTitle, styles.loadingHeaderText, { color: theme.textSecondary }]}>
                        {searchingText}
                    </Text>
                </View>
            );
        }
        return (
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Gönderiler</Text>
        );
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

            {/* Phase 1: Hashtag discovery — no tabs, just hashtag list */}
            {shouldSearch && isCommittedSearch && isHashtagDiscovery && (
                <FlatList
                    data={hashtagResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: hashtag }) => (
                        <Pressable
                            style={styles.resultRow}
                            onPress={() => commitHashtagFullSearch(hashtag.name)}
                        >
                            <View style={[styles.searchBubble, { backgroundColor: inputColors.backgroundColor }]}>
                                <Hash size={20} color={inputColors.iconColor} />
                            </View>
                            <View style={styles.resultInfo}>
                                <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                    #{hashtag.name}
                                </Text>
                                <Text style={[styles.resultMeta, { color: theme.textSecondary }]}>
                                    {formatCount(hashtag.post_count)} gönderi
                                </Text>
                            </View>
                        </Pressable>
                    )}
                    contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]}
                    ListEmptyComponent={
                        isHashtagsLoading ? (
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="small" color={theme.textSecondary} />
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Etiket bulunamadı</Text>
                            </View>
                        )
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Phase 2: Full tabbed search (normal or after picking a hashtag) */}
            {shouldSearch && isCommittedSearch && !isHashtagDiscovery && (
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
                            onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
                            onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
                            scrollEventThrottle={16}
                            ListHeaderComponent={<AccountsHeader />}
                            ListFooterComponent={
                                <View onLayout={(event) => setFooterOffsetY(event.nativeEvent.layout.y)}>
                                    <View style={styles.sectionSpacer} />
                                    {postsError ? null : (!isLoading && (isPostsLoading || postResults.length > 0)) ? (
                                        <>
                                            <PostsHeader />
                                            <View style={styles.sectionSpacer} />
                                            {isPostsLoading ? null : (
                                                <View
                                                    style={[styles.postGrid, { width: windowWidth, marginLeft: -16 }]}
                                                    onLayout={(event) => setGridLocalY(event.nativeEvent.layout.y)}
                                                >
                                                    {postResults.map((post, index) => renderPostTile(post, index))}
                                                </View>
                                            )}
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
                            ListEmptyComponent={ResultsEmpty}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                    {selectedTab === 'Etiketler' && (
                        <FlatList
                            data={hashtagResults}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item: hashtag }) => (
                                <Pressable
                                    style={styles.resultRow}
                                    onPress={() => commitHashtagFullSearch(hashtag.name)}
                                >
                                    <View style={[styles.searchBubble, { backgroundColor: inputColors.backgroundColor }]}>
                                        <Hash size={20} color={inputColors.iconColor} />
                                    </View>
                                    <View style={styles.resultInfo}>
                                        <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                            #{hashtag.name}
                                        </Text>
                                        <Text style={[styles.resultMeta, { color: theme.textSecondary }]}>
                                            {formatCount(hashtag.post_count)} gönderi
                                        </Text>
                                    </View>
                                </Pressable>
                            )}
                            contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]}
                            ListEmptyComponent={
                                isHashtagsLoading ? (
                                    <View style={styles.emptyState}>
                                        <ActivityIndicator size="small" color={theme.textSecondary} />
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Etiket bulunamadı</Text>
                                    </View>
                                )
                            }
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                    {selectedTab !== 'Senin İçin' && selectedTab !== 'Hesaplar' && selectedTab !== 'Etiketler' && (
                        <View style={[styles.resultsContent, { paddingBottom: insets.bottom + 24 }]} />
                    )}
                </>
            )}
            <View
                pointerEvents="none"
                style={[styles.systemNavBarSpacer, { height: insets.bottom, backgroundColor: DARK_COLORS.background }]}
            />
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
    loadingHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loadingHeaderText: {
        fontWeight: '500',
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
    tabBarWrapper: {
        borderBottomWidth: 1,
        marginTop: 8,
    },
    systemNavBarSpacer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
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
    postMedia: {
        width: '100%',
        aspectRatio: 4 / 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    postMediaFill: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    postMediaFallback: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    postOverlay: {
        position: 'absolute',
        right: 6,
        top: 6,
        width: DISCOVERY_ICON_BG_SIZE,
        height: DISCOVERY_ICON_BG_SIZE,
        borderRadius: 6,
    },
    postOverlayBubble: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
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
