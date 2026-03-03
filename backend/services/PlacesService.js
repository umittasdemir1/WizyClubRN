const axios = require('axios');
const { createHttpError } = require('../utils/httpError');

const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';
const GOOGLE_PLACES_SEARCH_FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
].join(',');
const GOOGLE_PLACES_DETAILS_FIELD_MASK = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
].join(',');
const GOOGLE_PLACES_AUTOCOMPLETE_FIELD_MASK = [
    'suggestions.placePrediction.placeId',
    'suggestions.placePrediction.text.text',
    'suggestions.placePrediction.structuredFormat.mainText.text',
    'suggestions.placePrediction.structuredFormat.secondaryText.text',
    'suggestions.placePrediction.distanceMeters',
].join(',');
const DEFAULT_NEARBY_RADIUS_METERS = 1500;
const DEFAULT_SEARCH_RADIUS_METERS = 5000;
const DEFAULT_NEARBY_LIMIT = 8;
const DEFAULT_AUTOCOMPLETE_LIMIT = 6;
const NEARBY_CACHE_TTL_MS = 5 * 60 * 1000;
const PLACE_DETAILS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const clamp = (value, min, max, fallback) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

const roundCoordinate = (value, precision = 3) =>
    Number.parseFloat(Number(value).toFixed(precision));

const createCoordinateCacheKey = ({ latitude, longitude, radiusMeters, limit }) => [
    roundCoordinate(latitude),
    roundCoordinate(longitude),
    Math.round(radiusMeters),
    Math.round(limit),
].join(':');

const isCacheEntryValid = (entry) =>
    Boolean(entry) && typeof entry.expiresAt === 'number' && entry.expiresAt > Date.now();

const createCacheEntry = (value, ttlMs) => ({
    value,
    expiresAt: Date.now() + ttlMs,
});

const normalizePlace = (place) => {
    const latitude = place?.location?.latitude;
    const longitude = place?.location?.longitude;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    const name = String(place?.displayName?.text || '').trim();
    const address = String(place?.formattedAddress || '').trim();

    if (!name) {
        return null;
    }

    return {
        placeId: String(place?.id || '').trim() || undefined,
        name,
        address: address || 'Adres bilgisi yok',
        latitude,
        longitude,
    };
};

const normalizeAutocompleteSuggestion = (suggestion) => {
    const prediction = suggestion?.placePrediction;
    const placeId = String(prediction?.placeId || '').trim();
    const mainText = String(prediction?.structuredFormat?.mainText?.text || '').trim();
    const secondaryText = String(prediction?.structuredFormat?.secondaryText?.text || '').trim();
    const displayText = String(prediction?.text?.text || '').trim();
    const distanceMeters = prediction?.distanceMeters;
    const name = mainText || displayText;

    if (!placeId || !name) {
        return null;
    }

    return {
        placeId,
        name,
        address: secondaryText || displayText || 'Adres bilgisi yok',
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : undefined,
    };
};

class PlacesService {
    constructor({ apiKey, logLine, httpClient } = {}) {
        this.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
        this.logLine = typeof logLine === 'function' ? logLine : null;
        this.httpClient = httpClient || axios.create({
            baseURL: GOOGLE_PLACES_BASE_URL,
            timeout: 10000,
        });
        this.nearbyCache = new Map();
        this.placeDetailsCache = new Map();
    }

    isAvailable() {
        return this.apiKey.length > 0;
    }

    async searchNearby({ latitude, longitude, radiusMeters, limit } = {}) {
        const safeRadiusMeters = clamp(radiusMeters, 100, 5000, DEFAULT_NEARBY_RADIUS_METERS);
        const safeLimit = clamp(limit, 1, 10, DEFAULT_NEARBY_LIMIT);
        const cacheKey = createCoordinateCacheKey({
            latitude,
            longitude,
            radiusMeters: safeRadiusMeters,
            limit: safeLimit,
        });
        const cached = this.nearbyCache.get(cacheKey);

        if (isCacheEntryValid(cached)) {
            return cached.value;
        }

        const places = await this.#requestPlaces('/places:searchNearby', {
            languageCode: 'tr',
            regionCode: 'TR',
            maxResultCount: safeLimit,
            rankPreference: 'DISTANCE',
            locationRestriction: {
                circle: {
                    center: {
                        latitude,
                        longitude,
                    },
                    radius: safeRadiusMeters,
                },
            },
        }, {
            scope: 'nearby',
            latitude,
            longitude,
        });

        this.nearbyCache.set(cacheKey, createCacheEntry(places, NEARBY_CACHE_TTL_MS));
        return places;
    }

    async autocomplete({ query, latitude, longitude, radiusMeters, limit, sessionToken } = {}) {
        const safeLimit = clamp(limit, 1, 10, DEFAULT_AUTOCOMPLETE_LIMIT);
        const body = {
            input: query,
            languageCode: 'tr',
            regionCode: 'TR',
            includeQueryPredictions: false,
            inputOffset: String(query || '').length,
            sessionToken,
        };

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            body.origin = { latitude, longitude };
            body.locationBias = {
                circle: {
                    center: {
                        latitude,
                        longitude,
                    },
                    radius: clamp(radiusMeters, 100, 50000, DEFAULT_SEARCH_RADIUS_METERS),
                },
            };
        }

        const response = await this.#request('/places:autocomplete', body, {
            scope: 'autocomplete',
            query,
            latitude,
            longitude,
        }, GOOGLE_PLACES_AUTOCOMPLETE_FIELD_MASK);
        const suggestions = Array.isArray(response.data?.suggestions) ? response.data.suggestions : [];

        return suggestions
            .map(normalizeAutocompleteSuggestion)
            .filter(Boolean)
            .slice(0, safeLimit);
    }

    async getPlaceDetails({ placeId, sessionToken } = {}) {
        const normalizedPlaceId = String(placeId || '').trim();
        if (!normalizedPlaceId) {
            throw createHttpError(400, 'placeId is required');
        }

        const cached = this.placeDetailsCache.get(normalizedPlaceId);
        if (isCacheEntryValid(cached)) {
            return cached.value;
        }

        const response = await this.#request(
            `/places/${encodeURIComponent(normalizedPlaceId)}`,
            undefined,
            {
                scope: 'details',
                placeId: normalizedPlaceId,
            },
            GOOGLE_PLACES_DETAILS_FIELD_MASK,
            {
                method: 'get',
                params: sessionToken ? { sessionToken } : undefined,
            }
        );
        const place = normalizePlace(response.data);

        if (!place) {
            throw createHttpError(404, 'Place details could not be resolved', 'PLACE_NOT_FOUND');
        }

        this.placeDetailsCache.set(normalizedPlaceId, createCacheEntry(place, PLACE_DETAILS_CACHE_TTL_MS));
        return place;
    }

    async #requestPlaces(endpoint, body, context = {}) {
        const response = await this.#request(
            endpoint,
            body,
            context,
            GOOGLE_PLACES_SEARCH_FIELD_MASK
        );
        const places = Array.isArray(response.data?.places) ? response.data.places : [];

        return places
            .map(normalizePlace)
            .filter(Boolean);
    }

    async #request(endpoint, body, context = {}, fieldMask, requestOverrides = {}) {
        if (!this.isAvailable()) {
            throw createHttpError(503, 'Google Places API key is not configured', 'PLACES_NOT_CONFIGURED');
        }

        const method = requestOverrides.method || 'post';

        try {
            return await this.httpClient.request({
                url: endpoint,
                method,
                data: body,
                ...requestOverrides,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.apiKey,
                    ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : null),
                    ...(requestOverrides.headers || {}),
                },
            });
        } catch (error) {
            const upstreamStatus = error?.response?.status;
            const upstreamMessage = error?.response?.data?.error?.message;
            const message = upstreamMessage || 'Google Places request failed';

            if (this.logLine) {
                this.logLine('ERR', 'PLACES', 'Google Places request failed', {
                    endpoint,
                    message,
                    upstreamStatus,
                    ...context,
                });
            }

            throw createHttpError(502, message, 'PLACES_UPSTREAM_ERROR');
        }
    }
}

module.exports = PlacesService;
