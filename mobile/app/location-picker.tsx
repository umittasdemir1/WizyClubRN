import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowLeft, Check, MapPinCheckInside, Search, X } from 'lucide-react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { LogCode, logError } from '@/core/services/Logger';
import { CONFIG } from '../src/core/config';

type UploadLocationSelection = {
    id?: string;
    placeId?: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
};

type LocationSuggestion = {
    id?: string;
    placeId?: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    distanceMeters?: number;
};

type PlacesAutocompleteResponse = {
    success?: boolean;
    data?: {
        predictions?: PlacesApiPrediction[];
    };
    error?: string;
};

type PlacesListResponse = {
    success?: boolean;
    data?: {
        places?: PlacesApiPlace[];
    };
    error?: string;
};

type PlaceDetailsResponse = {
    success?: boolean;
    data?: {
        place?: {
            placeId?: string;
            name?: string;
            address?: string;
            latitude?: number;
            longitude?: number;
        };
    };
    error?: string;
};

type CacheEntry<T> = {
    expiresAt: number;
    value: T;
};

type PlacesApiPlace = {
    placeId?: string;
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
};

type PlacesApiPrediction = {
    placeId?: string;
    name?: string;
    address?: string;
    distanceMeters?: number;
};

const SEARCH_DEBOUNCE_MS = 800;
const SEARCH_RESULT_LIMIT = 6;
const NEARBY_RESULT_LIMIT = 8;
const DEFAULT_NEARBY_RADIUS_METERS = 1600;
const DEFAULT_SEARCH_RADIUS_METERS = 5000;
const NEARBY_CACHE_TTL_MS = 5 * 60 * 1000;
const AUTOCOMPLETE_CACHE_TTL_MS = 90 * 1000;
const MIN_SEARCH_CHARACTERS = 3;

const nearbyCache = new Map<string, CacheEntry<UploadLocationSelection[]>>();
const autocompleteCache = new Map<string, CacheEntry<LocationSuggestion[]>>();

const isCacheEntryValid = <T,>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> =>
    entry !== undefined && entry.expiresAt > Date.now();

const createCacheEntry = <T,>(value: T, ttlMs: number): CacheEntry<T> => ({
    value,
    expiresAt: Date.now() + ttlMs,
});

const roundCoordinate = (value: number, precision: number = 3): number =>
    Number.parseFloat(value.toFixed(precision));

const getCoordinateBucketKey = (latitude: number, longitude: number): string =>
    `${roundCoordinate(latitude)}:${roundCoordinate(longitude)}`;

const formatLocationMetadata = (
    geocoded: Location.LocationGeocodedAddress[]
): Pick<UploadLocationSelection, 'name' | 'address'> => {
    const firstMatch = geocoded[0];
    if (!firstMatch) {
        return {
            name: 'Mevcut Konum',
            address: 'Konum eklendi',
        };
    }

    const primaryParts = [firstMatch.name, firstMatch.street]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    const secondaryParts = [
        firstMatch.district,
        firstMatch.city,
        firstMatch.region,
        firstMatch.country,
    ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);

    const address = [...new Set([...primaryParts.slice(1), ...secondaryParts])].join(', ');

    return {
        name: primaryParts[0] ?? firstMatch.city ?? firstMatch.region ?? 'Mevcut Konum',
        address: address || 'Konum eklendi',
    };
};

const getStoredLocation = (
    draft: ReturnType<typeof useUploadComposerStore.getState>['draft']
): UploadLocationSelection | null => {
    if (
        typeof draft?.locationLatitude !== 'number' ||
        typeof draft?.locationLongitude !== 'number'
    ) {
        return null;
    }

    return {
        id: `stored:${draft.locationLatitude.toFixed(5)}:${draft.locationLongitude.toFixed(5)}`,
        name: draft.locationName || 'Mevcut Konum',
        address: draft.locationAddress || 'Konum eklendi',
        latitude: draft.locationLatitude,
        longitude: draft.locationLongitude,
    };
};

const hasCoordinates = (
    value: Pick<LocationSuggestion, 'latitude' | 'longitude'>
): value is { latitude: number; longitude: number } =>
    Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

const isSameLocation = (
    left: Pick<LocationSuggestion, 'placeId' | 'latitude' | 'longitude'> | null,
    right: Pick<LocationSuggestion, 'placeId' | 'latitude' | 'longitude'> | null
): boolean => {
    if (!left || !right) return false;

    if (left.placeId && right.placeId) {
        return left.placeId === right.placeId;
    }

    if (!hasCoordinates(left) || !hasCoordinates(right)) {
        return false;
    }

    return (
        Math.abs(left.latitude - right.latitude) < 0.00001 &&
        Math.abs(left.longitude - right.longitude) < 0.00001
    );
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const calculateDistanceMeters = (
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number
): number => {
    const earthRadiusMeters = 6371000;
    const deltaLatitude = toRadians(toLatitude - fromLatitude);
    const deltaLongitude = toRadians(toLongitude - fromLongitude);
    const startLatitude = toRadians(fromLatitude);
    const endLatitude = toRadians(toLatitude);

    const a =
        Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
        Math.cos(startLatitude) * Math.cos(endLatitude) *
        Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
};

const formatDistance = (distanceMeters: number): string => {
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
        return '0 m';
    }

    if (distanceMeters < 1000) {
        return `${Math.max(1, Math.round(distanceMeters))} m`;
    }

    const distanceKm = distanceMeters / 1000;
    return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
};

const dedupeLocations = <T extends { placeId?: string; latitude?: number; longitude?: number }>(
    items: T[]
): T[] => {
    const seen = new Set<string>();

    return items.filter((item) => {
        const key = item.placeId
            ? `place:${item.placeId}`
            : hasCoordinates(item)
                ? `${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`
                : `fallback:${JSON.stringify(item)}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

const normalizePlacesList = (
    places: PlacesApiPlace[] | undefined,
    prefix: string
): UploadLocationSelection[] => {
    if (!Array.isArray(places)) return [];
    const nextResults: UploadLocationSelection[] = [];

    places.forEach((item, index) => {
        if (
            typeof item?.latitude !== 'number' ||
            typeof item?.longitude !== 'number'
        ) {
            return;
        }

        const name = String(item?.name || '').trim();
        if (!name) return;

        const placeId = typeof item?.placeId === 'string' ? item.placeId.trim() : '';
        nextResults.push({
            id: placeId || `${prefix}:${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}:${index}`,
            placeId: placeId || undefined,
            name,
            address: String(item?.address || '').trim() || 'Adres bilgisi yok',
            latitude: item.latitude,
            longitude: item.longitude,
        });
    });

    return dedupeLocations(nextResults);
};

const normalizeAutocompleteSuggestions = (
    predictions: PlacesApiPrediction[] | undefined
): LocationSuggestion[] => {
    if (!Array.isArray(predictions)) return [];
    const nextResults: LocationSuggestion[] = [];

    predictions.forEach((item, index) => {
        const placeId = typeof item?.placeId === 'string' ? item.placeId.trim() : '';
        const name = String(item?.name || '').trim();

        if (!placeId || !name) {
            return;
        }

        nextResults.push({
            id: `${placeId}:${index}`,
            placeId,
            name,
            address: String(item?.address || '').trim() || 'Adres bilgisi yok',
            distanceMeters: Number.isFinite(item?.distanceMeters) ? item.distanceMeters : undefined,
        });
    });

    return dedupeLocations(nextResults);
};

const createSessionToken = (): string =>
    `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

async function fetchNearbyPlaces(
    latitude: number,
    longitude: number
): Promise<UploadLocationSelection[]> {
    const cacheKey = `${getCoordinateBucketKey(latitude, longitude)}:${DEFAULT_NEARBY_RADIUS_METERS}:${NEARBY_RESULT_LIMIT}`;
    const cached = nearbyCache.get(cacheKey);

    if (isCacheEntryValid(cached)) {
        return cached.value;
    }

    const response = await fetch(
        `${CONFIG.API_URL}/places/nearby?latitude=${encodeURIComponent(String(latitude))}&longitude=${encodeURIComponent(String(longitude))}&radiusMeters=${DEFAULT_NEARBY_RADIUS_METERS}&limit=${NEARBY_RESULT_LIMIT}`
    );
    const payload = (await response.json().catch(() => ({}))) as PlacesListResponse;

    if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Failed to fetch nearby places');
    }

    const normalized = normalizePlacesList(payload.data?.places, 'nearby');
    nearbyCache.set(cacheKey, createCacheEntry(normalized, NEARBY_CACHE_TTL_MS));
    return normalized;
}

async function fetchRecentPlaces(
    userId: string
): Promise<UploadLocationSelection[]> {
    try {
        const response = await fetch(`${CONFIG.API_URL}/places/recents?userId=${encodeURIComponent(userId)}&limit=5`);
        const payload = (await response.json().catch(() => ({}))) as PlacesListResponse;

        if (!response.ok || payload.success === false) {
            return [];
        }

        return normalizePlacesList(payload.data?.places, 'recent');
    } catch {
        return [];
    }
}

async function recordPlaceUsage({
    userId,
    place,
}: {
    userId: string;
    place: UploadLocationSelection;
}) {
    try {
        const providerPlaceId = place.placeId || place.id;
        // Don't record fake device coordinates
        if (!providerPlaceId || providerPlaceId.startsWith('device:')) return;

        await fetch(`${CONFIG.API_URL}/places/usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, providerPlaceId, kind: 'recent' }),
        });
    } catch {
        // Silently fail, best-effort metrics
    }
}

async function fetchAutocompleteSuggestions(
    query: string,
    latitude: number | undefined,
    longitude: number | undefined,
    sessionToken: string
): Promise<LocationSuggestion[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    const locationKey = (
        Number.isFinite(latitude) && Number.isFinite(longitude)
            ? getCoordinateBucketKey(latitude as number, longitude as number)
            : 'none'
    );
    const cacheKey = `${normalizedQuery}:${locationKey}`;
    const cached = autocompleteCache.get(cacheKey);

    if (isCacheEntryValid(cached)) {
        return cached.value;
    }

    const params = new URLSearchParams({
        q: query,
        limit: String(SEARCH_RESULT_LIMIT),
        radiusMeters: String(DEFAULT_SEARCH_RADIUS_METERS),
        sessionToken,
    });

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        params.set('latitude', String(latitude));
        params.set('longitude', String(longitude));
    }

    const response = await fetch(`${CONFIG.API_URL}/places/autocomplete?${params.toString()}`);
    const payload = (await response.json().catch(() => ({}))) as PlacesAutocompleteResponse;

    if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Failed to autocomplete places');
    }

    const normalized = normalizeAutocompleteSuggestions(payload.data?.predictions);
    autocompleteCache.set(cacheKey, createCacheEntry(normalized, AUTOCOMPLETE_CACHE_TTL_MS));
    return normalized;
}

async function fetchPlaceDetails(
    placeId: string,
    sessionToken?: string
): Promise<UploadLocationSelection> {
    const params = sessionToken
        ? `?sessionToken=${encodeURIComponent(sessionToken)}`
        : '';
    const response = await fetch(
        `${CONFIG.API_URL}/places/details/${encodeURIComponent(placeId)}${params}`
    );
    const payload = (await response.json().catch(() => ({}))) as PlaceDetailsResponse;

    if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Failed to resolve place details');
    }

    const normalized = normalizePlacesList(
        payload.data?.place ? [payload.data.place] : [],
        'details'
    );
    const place = normalized[0];

    if (!place) {
        throw new Error('Place details are incomplete');
    }

    return place;
}

async function fallbackGeocodeSearch(query: string): Promise<UploadLocationSelection[]> {
    const geocoded = await Location.geocodeAsync(query);

    const uniqueCoordinates = geocoded.filter((item, index, all) => {
        const key = `${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
        return index === all.findIndex((candidate) => (
            `${candidate.latitude.toFixed(5)}:${candidate.longitude.toFixed(5)}` === key
        ));
    });

    const nextResults = await Promise.all(
        uniqueCoordinates.slice(0, SEARCH_RESULT_LIMIT).map(async (item, index) => {
            const { latitude, longitude } = item;
            const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
            const meta = formatLocationMetadata(reverse);

            return {
                id: `fallback:${latitude.toFixed(5)}:${longitude.toFixed(5)}:${index}`,
                ...meta,
                latitude,
                longitude,
            } satisfies UploadLocationSelection;
        })
    );

    return dedupeLocations(nextResults);
}

export default function LocationPickerScreen() {
    const insets = useSafeAreaInsets();
    const isDark = useThemeStore((state) => state.isDark);
    const modalTheme = useSurfaceTheme(isDark);
    const draft = useUploadComposerStore((state) => state.draft);
    const setDraft = useUploadComposerStore((state) => state.setDraft);
    const storedLocation = useMemo(() => getStoredLocation(draft), [draft]);
    const hasAutoRequestedRef = useRef(false);
    const searchSessionTokenRef = useRef<string | null>(null);

    const [query, setQuery] = useState('');
    const [isResolvingLocation, setIsResolvingLocation] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isResolvingSelection, setIsResolvingSelection] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [nearbyError, setNearbyError] = useState<string | null>(null);
    const [currentLocation, setCurrentLocation] = useState<UploadLocationSelection | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<UploadLocationSelection | null>(storedLocation);
    const [searchResults, setSearchResults] = useState<LocationSuggestion[]>([]);
    const [nearbyPlaces, setNearbyPlaces] = useState<UploadLocationSelection[]>([]);
    const [recentPlaces, setRecentPlaces] = useState<UploadLocationSelection[]>([]);

    const user = useAuthStore((state) => state.user);

    const bgColor = modalTheme.fullScreenBackground;
    const textColor = modalTheme.textPrimary;
    const subtextColor = modalTheme.textSecondary;
    const canSave = Boolean(draft && selectedLocation);
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
    const primaryLocation = currentLocation ?? selectedLocation;
    const trimmedQuery = query.trim();
    const visibleSecondaryPlaces = useMemo(() => {
        const baseList: LocationSuggestion[] = trimmedQuery.length >= MIN_SEARCH_CHARACTERS
            ? searchResults
            : dedupeLocations(nearbyPlaces);
        return baseList.filter((item) => !isSameLocation(item, primaryLocation));
    }, [nearbyPlaces, primaryLocation, searchResults, trimmedQuery]);

    const visibleRecentPlaces = useMemo(() => {
        if (trimmedQuery.length >= MIN_SEARCH_CHARACTERS) return [];
        return dedupeLocations(recentPlaces).filter((item) => !isSameLocation(item, primaryLocation));
    }, [primaryLocation, recentPlaces, trimmedQuery]);

    const getDistanceFromCurrent = useCallback((item: LocationSuggestion): number | undefined => {
        if (Number.isFinite(item.distanceMeters)) {
            return item.distanceMeters;
        }

        if (currentLocation && hasCoordinates(item) && !isSameLocation(currentLocation, item)) {
            return calculateDistanceMeters(
                currentLocation.latitude,
                currentLocation.longitude,
                item.latitude,
                item.longitude
            );
        }

        return undefined;
    }, [currentLocation]);

    const sortedSecondaryPlaces = useMemo(
        () => [...visibleSecondaryPlaces].sort((left, right) => {
            const leftDistance = getDistanceFromCurrent(left);
            const rightDistance = getDistanceFromCurrent(right);

            if (leftDistance === undefined && rightDistance === undefined) return 0;
            if (leftDistance === undefined) return 1;
            if (rightDistance === undefined) return -1;

            return leftDistance - rightDistance;
        }),
        [getDistanceFromCurrent, visibleSecondaryPlaces]
    );

    const resolveCurrentLocation = useCallback(async (shouldSelect: boolean = true) => {
        if (!draft || isResolvingLocation) return;

        setIsResolvingLocation(true);
        setNearbyError(null);

        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Konum İzni Gerekli', 'Konum eklemek için konum izni vermen gerekiyor.');
                return;
            }

            const currentPosition = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = currentPosition.coords;

            let nextCurrentLocation: UploadLocationSelection | null = null;
            let nextNearbyPlaces: UploadLocationSelection[] = [];

            try {
                nextNearbyPlaces = await fetchNearbyPlaces(latitude, longitude);
                nextCurrentLocation = nextNearbyPlaces[0] ?? null;
            } catch (error) {
                logError(LogCode.EXCEPTION_UNCAUGHT, 'Nearby places lookup failed', error);
                setNearbyError('Yakındaki yerler şu an alınamıyor.');
            }

            if (!nextCurrentLocation) {
                const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
                const locationMeta = formatLocationMetadata(geocoded);
                nextCurrentLocation = {
                    id: `device:${latitude.toFixed(5)}:${longitude.toFixed(5)}`,
                    ...locationMeta,
                    latitude,
                    longitude,
                };
            }

            setCurrentLocation(nextCurrentLocation);
            setNearbyPlaces(dedupeLocations(
                nextNearbyPlaces.length > 0
                    ? nextNearbyPlaces
                    : [nextCurrentLocation]
            ));

            if (shouldSelect) {
                setSelectedLocation(nextCurrentLocation);
            }
        } catch (error) {
            logError(LogCode.EXCEPTION_UNCAUGHT, 'Location resolution failed', error);
            Alert.alert('Hata', 'Konum alınırken bir sorun oluştu. Lütfen tekrar dene.');
        } finally {
            setIsResolvingLocation(false);
        }
    }, [draft, isResolvingLocation]);

    useEffect(() => {
        if (!draft || currentLocation || hasAutoRequestedRef.current) return;

        hasAutoRequestedRef.current = true;
        void resolveCurrentLocation(!selectedLocation);
    }, [currentLocation, draft, resolveCurrentLocation, selectedLocation]);

    useEffect(() => {
        let isCancelled = false;

        if (user?.id) {
            fetchRecentPlaces(user.id).then(recents => {
                if (!isCancelled) setRecentPlaces(recents);
            });
        }

        return () => { isCancelled = true; };
    }, [user?.id]);

    useEffect(() => {
        let isCancelled = false;

        if (!trimmedQuery) {
            searchSessionTokenRef.current = null;
            setSearchResults([]);
            setSearchError(null);
            setIsSearching(false);
            return () => {
                isCancelled = true;
            };
        }

        if (trimmedQuery.length < MIN_SEARCH_CHARACTERS) {
            setSearchResults([]);
            setSearchError(`Arama icin en az ${MIN_SEARCH_CHARACTERS} karakter yaz.`);
            setIsSearching(false);
            return () => {
                isCancelled = true;
            };
        }

        if (!searchSessionTokenRef.current) {
            searchSessionTokenRef.current = createSessionToken();
        }

        const timeoutId = setTimeout(() => {
            void (async () => {
                setIsSearching(true);
                setSearchError(null);

                try {
                    const suggestions = await fetchAutocompleteSuggestions(
                        trimmedQuery,
                        currentLocation?.latitude,
                        currentLocation?.longitude,
                        searchSessionTokenRef.current as string
                    );

                    if (isCancelled) return;

                    if (suggestions.length > 0) {
                        setSearchResults(suggestions);
                        return;
                    }

                    const fallbackResults = await fallbackGeocodeSearch(trimmedQuery);
                    if (isCancelled) return;

                    setSearchResults(fallbackResults);
                    setSearchError(fallbackResults.length === 0 ? 'Aramana uygun bir konum bulunamadı.' : null);
                } catch (error) {
                    if (isCancelled) return;

                    logError(LogCode.EXCEPTION_UNCAUGHT, 'Location search failed', error);

                    try {
                        const fallbackResults = await fallbackGeocodeSearch(trimmedQuery);
                        if (isCancelled) return;

                        setSearchResults(fallbackResults);
                        setSearchError(fallbackResults.length === 0 ? 'Aramana uygun bir konum bulunamadı.' : null);
                    } catch (fallbackError) {
                        if (isCancelled) return;

                        logError(LogCode.EXCEPTION_UNCAUGHT, 'Fallback geocode search failed', fallbackError);
                        setSearchResults([]);
                        setSearchError('Konum aranırken bir sorun oluştu.');
                    }
                } finally {
                    if (!isCancelled) {
                        setIsSearching(false);
                    }
                }
            })();
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [currentLocation?.latitude, currentLocation?.longitude, trimmedQuery]);

    const persistSelectedLocation = useCallback(() => {
        if (!draft || !selectedLocation) {
            return false;
        }

        setDraft({
            ...draft,
            locationName: selectedLocation.name,
            locationAddress: selectedLocation.address,
            locationLatitude: selectedLocation.latitude,
            locationLongitude: selectedLocation.longitude,
        });

        return true;
    }, [draft, selectedLocation, setDraft]);
    const handleSaveLocation = useCallback(() => {
        const didPersist = persistSelectedLocation();
        if (!didPersist) {
            return;
        }

        if (user?.id && selectedLocation) {
            void recordPlaceUsage({ userId: user.id, place: selectedLocation });
        }

        router.back();
    }, [persistSelectedLocation, selectedLocation, user?.id]);

    const handleSelectItem = useCallback(async (item: LocationSuggestion) => {
        if (isResolvingSelection) return;

        if (hasCoordinates(item)) {
            setSelectedLocation({
                ...item,
                latitude: item.latitude,
                longitude: item.longitude,
            });
            return;
        }

        if (!item.placeId) {
            return;
        }

        setIsResolvingSelection(true);

        try {
            const detailedPlace = await fetchPlaceDetails(
                item.placeId,
                searchSessionTokenRef.current || undefined
            );

            setSelectedLocation(detailedPlace);
            searchSessionTokenRef.current = null;
        } catch (error) {
            logError(LogCode.EXCEPTION_UNCAUGHT, 'Place details resolution failed', error);
            Alert.alert('Hata', 'Bu konum secilirken bir sorun olustu. Lutfen tekrar dene.');
        } finally {
            setIsResolvingSelection(false);
        }
    }, [isResolvingSelection]);

    const renderLocationRow = (
        item: LocationSuggestion,
        options?: {
            onPress?: () => void;
            assistiveLabel?: string;
            isRecent?: boolean;
        }
    ) => {
        const isSelected = isSameLocation(selectedLocation, item);
        const resolvedDistanceMeters = getDistanceFromCurrent(item);
        const distanceLabel = resolvedDistanceMeters !== undefined
            ? formatDistance(resolvedDistanceMeters)
            : null;

        const subtitleParts = [];
        if (options?.assistiveLabel) subtitleParts.push(options.assistiveLabel);
        if (options?.isRecent) subtitleParts.push('Sık ziyaret edilen');
        if (distanceLabel) subtitleParts.push(distanceLabel);
        if (item.address) subtitleParts.push(item.address);

        const subtitle = subtitleParts.join(' • ');

        return (
            <Pressable
                key={item.id ?? item.placeId ?? `${item.name}:${item.address}`}
                style={styles.locationRow}
                onPress={options?.onPress ?? (() => void handleSelectItem(item))}
                disabled={isResolvingSelection}
            >
                <View style={styles.locationRowContent}>
                    <Text style={[styles.locationRowTitle, { color: textColor }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.locationRowSubtitle, { color: subtextColor }]} numberOfLines={2}>
                        {subtitle}
                    </Text>
                </View>
                {isSelected ? (
                    <View style={styles.locationRowCheck}>
                        <Check size={18} color="#0A84FF" />
                    </View>
                ) : null}
            </Pressable>
        );
    };

    if (!draft) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <SystemBars style={isDark ? 'light' : 'dark'} />

            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + 10,
                    },
                ]}
            >
                <View style={styles.headerSide}>
                    <Pressable onPress={() => router.back()} style={styles.headerAction} hitSlop={8}>
                        <ArrowLeft size={24} color={textColor} />
                    </Pressable>
                </View>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Konum Ekle</Text>
                </View>
                <View style={[styles.headerSide, styles.headerSideRight]}>
                    <Pressable
                        onPress={() => {
                            void resolveCurrentLocation(true);
                        }}
                        disabled={isResolvingLocation}
                        hitSlop={8}
                    >
                        <Text style={[styles.doneText, { color: isResolvingLocation ? subtextColor : '#0A84FF' }]}>
                            {isResolvingLocation ? 'Alınıyor...' : 'Güncelle'}
                        </Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingBottom: insets.bottom + 180,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.introBlock}>
                    <Text style={[styles.introTitle, { color: textColor }]}>
                        Etiketleme için konumunu seç
                    </Text>
                    <Text style={[styles.introSubtitle, { color: subtextColor }]}>
                        Bu içeriği, paylaştığınız kişiler etiketlediğiniz konum ile birlikte görecekler. Bu içerik etiketlenen konumu görüntüleyen kişilerede gösterilebilir.
                    </Text>
                </View>

                <View
                    style={[
                        styles.searchWrap,
                        {
                            backgroundColor: inputColors.backgroundColor,
                            borderColor: inputColors.borderColor,
                        },
                    ]}
                >
                    <Search size={18} color={inputColors.iconColor} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Bir konum ara"
                        placeholderTextColor={placeholderColor}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                    />
                    {query.length > 0 ? (
                        <Pressable
                            style={styles.clearButton}
                            onPress={() => {
                                setQuery('');
                                setSearchResults([]);
                                setSearchError(null);
                                searchSessionTokenRef.current = null;
                            }}
                        >
                            <X size={16} color={subtextColor} />
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.listBlock}>
                    {!isSearching && visibleRecentPlaces.length > 0 && (
                        <View style={styles.resultsList}>
                            {visibleRecentPlaces.map((item) => renderLocationRow(item, { isRecent: true }))}
                        </View>
                    )}

                    {!isSearching && (
                        primaryLocation ? (
                            renderLocationRow(primaryLocation, {
                                onPress: () => setSelectedLocation(primaryLocation),
                                assistiveLabel: currentLocation ? 'Mevcut konum' : 'Seçili konum',
                            })
                        ) : (
                            <Pressable
                                style={styles.emptyRow}
                                onPress={() => {
                                    void resolveCurrentLocation(true);
                                }}
                            >
                                <Text style={[styles.emptyRowTitle, { color: textColor }]}>
                                    Mevcut konumunu kullan
                                </Text>
                                <Text style={[styles.emptyRowSubtitle, { color: subtextColor }]}>
                                    Dokunarak cihazının mevcut konumunu alabilirsin.
                                </Text>
                            </Pressable>
                        )
                    )}

                    {isSearching ? (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoRowText, { color: subtextColor }]}>Konum aranıyor...</Text>
                        </View>
                    ) : searchError ? (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoRowText, { color: subtextColor }]}>{searchError}</Text>
                        </View>
                    ) : sortedSecondaryPlaces.length > 0 ? (
                        <View style={styles.resultsList}>
                            {sortedSecondaryPlaces.map((item) => renderLocationRow(item))}
                        </View>
                    ) : (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoRowText, { color: subtextColor }]}>
                                {trimmedQuery.length >= MIN_SEARCH_CHARACTERS
                                    ? 'Aramana uygun bir konum bulunamadı.'
                                    : (nearbyError || 'Yakın yerler yüklenince burada listelenecek.')}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View
                style={[
                    styles.bottomBar,
                    {
                        backgroundColor: bgColor,
                        paddingBottom: insets.bottom + 12,
                    },
                ]}
            >
                <Pressable
                    style={[
                        styles.saveLocationButton,
                        (!canSave || isResolvingSelection) && styles.saveLocationButtonDisabled,
                    ]}
                    onPress={handleSaveLocation}
                    disabled={!canSave || isResolvingSelection}
                >
                    <Text style={styles.saveLocationButtonText}>Konumu Kaydet</Text>
                </Pressable>
                <View style={styles.previewButton}>
                    <Text style={[styles.previewButtonText, { color: textColor }]}>Önizlemesini Gör</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 82,
    },
    headerSide: {
        width: 80,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerSideRight: {
        alignItems: 'flex-end',
    },
    headerAction: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    doneText: {
        fontSize: 16,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    introBlock: {
        marginTop: 40,
        alignItems: 'center',
    },
    introTitle: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 28,
        textAlign: 'center',
    },
    introSubtitle: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
        textAlign: 'center',
    },
    searchWrap: {
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 40,
        gap: 10,
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
    listBlock: {
        marginTop: 40,
        gap: 12,
    },
    locationRow: {
        minHeight: 58,
        paddingHorizontal: 2,
        paddingVertical: 8,
        paddingRight: 28,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
    },
    locationRowContent: {
        flex: 1,
        gap: 2,
    },
    locationRowTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    locationRowSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 17,
    },
    locationRowCheck: {
        position: 'absolute',
        top: 8,
        right: 0,
    },
    emptyRow: {
        paddingHorizontal: 2,
        paddingVertical: 8,
        gap: 4,
    },
    emptyRowTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyRowSubtitle: {
        fontSize: 12,
        lineHeight: 17,
    },
    infoRow: {
        paddingHorizontal: 2,
        paddingVertical: 8,
    },
    infoRowText: {
        fontSize: 13,
        lineHeight: 18,
    },
    resultsList: {
        gap: 4,
    },
    bottomBar: {
        paddingTop: 12,
        paddingHorizontal: 20,
    },
    saveLocationButton: {
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0A84FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveLocationButtonDisabled: {
        opacity: 0.45,
    },
    saveLocationButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    previewButton: {
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    previewButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
