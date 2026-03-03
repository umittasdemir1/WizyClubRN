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

// Minimum DB results to skip Google fallback
const DB_NEARBY_THRESHOLD = 3;
const DB_SEARCH_THRESHOLD = 3;

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

const normalizeGooglePlace = (place) => {
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
    /**
     * @param {object} opts
     * @param {string}  opts.apiKey          - Google Places API key
     * @param {object}  opts.placesRepository - PlacesRepository instance (DB layer)
     * @param {Function} opts.logLine
     * @param {object}  opts.httpClient
     */
    constructor({ apiKey, placesRepository, logLine, httpClient } = {}) {
        this.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
        this.placesRepository = placesRepository || null;
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

    // =========================================================
    // NEARBY: DB-first → Google-fallback
    // =========================================================

    async searchNearby({ latitude, longitude, radiusMeters, limit } = {}) {
        const safeRadiusMeters = clamp(radiusMeters, 100, 5000, DEFAULT_NEARBY_RADIUS_METERS);
        const safeLimit = clamp(limit, 1, 10, DEFAULT_NEARBY_LIMIT);

        // 1) Check in-memory cache
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

        // 2) DB-first: ask PostGIS
        if (this.placesRepository) {
            try {
                const dbPlaces = await this.placesRepository.findNearby({
                    latitude,
                    longitude,
                    radiusMeters: safeRadiusMeters,
                    limit: safeLimit,
                });

                if (dbPlaces.length >= DB_NEARBY_THRESHOLD) {
                    this._log('OK', 'Nearby served from DB', {
                        count: dbPlaces.length,
                        latitude,
                        longitude,
                    });
                    this.nearbyCache.set(cacheKey, createCacheEntry(dbPlaces, NEARBY_CACHE_TTL_MS));
                    return dbPlaces;
                }
            } catch (dbError) {
                this._log('WARN', 'DB nearby lookup failed, falling back to Google', {
                    error: dbError?.message,
                });
            }
        }

        // 3) Google fallback
        const googlePlaces = await this.#requestPlaces('/places:searchNearby', {
            languageCode: 'tr',
            regionCode: 'TR',
            maxResultCount: safeLimit,
            rankPreference: 'DISTANCE',
            locationRestriction: {
                circle: {
                    center: { latitude, longitude },
                    radius: safeRadiusMeters,
                },
            },
        }, {
            scope: 'nearby',
            latitude,
            longitude,
        });

        // 4) Write-through: persist to DB (fire-and-forget)
        this.#persistPlacesToDb(googlePlaces);

        this.nearbyCache.set(cacheKey, createCacheEntry(googlePlaces, NEARBY_CACHE_TTL_MS));
        return googlePlaces;
    }

    // =========================================================
    // AUTOCOMPLETE: DB search → Google-fallback
    // =========================================================

    async autocomplete({ query, latitude, longitude, radiusMeters, limit, sessionToken } = {}) {
        const safeLimit = clamp(limit, 1, 10, DEFAULT_AUTOCOMPLETE_LIMIT);
        let finalResults = [];

        // 1) DB-first: trigram search
        if (this.placesRepository && query.length >= 2) {
            try {
                const dbResults = await this.placesRepository.searchByName({
                    query,
                    limit: safeLimit,
                });

                if (dbResults.length > 0) {
                    finalResults = [...dbResults];
                }

                if (dbResults.length >= DB_SEARCH_THRESHOLD) {
                    this._log('OK', 'Autocomplete served from DB entirely', {
                        count: dbResults.length,
                        query,
                    });
                    return dbResults;
                }
            } catch (dbError) {
                this._log('WARN', 'DB search failed, falling back to Google', {
                    error: dbError?.message,
                });
            }
        }

        // 2) Google fallback to fill the rest
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
                    center: { latitude, longitude },
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
        const googleDocs = suggestions.map(normalizeAutocompleteSuggestion).filter(Boolean);

        // Merge DB results (which are our priority ones because they have videos) with Google results
        for (const gDoc of googleDocs) {
            // Dedupe if we already got this from DB
            const exists = finalResults.some(dbDoc =>
                (dbDoc.placeId && dbDoc.placeId === gDoc.placeId) ||
                (dbDoc.name === gDoc.name)
            );
            if (!exists) {
                finalResults.push(gDoc);
            }
            if (finalResults.length >= safeLimit) break;
        }

        return finalResults;
    }

    // =========================================================
    // PLACE DETAILS: cache → DB → Google
    // =========================================================

    async getPlaceDetails({ placeId, sessionToken } = {}) {
        const normalizedPlaceId = String(placeId || '').trim();
        if (!normalizedPlaceId) {
            throw createHttpError(400, 'placeId is required');
        }

        // 1) In-memory cache
        const cached = this.placeDetailsCache.get(normalizedPlaceId);
        if (isCacheEntryValid(cached)) {
            return cached.value;
        }

        // 2) DB lookup
        if (this.placesRepository) {
            try {
                const dbPlace = await this.placesRepository.findByProviderPlaceId(normalizedPlaceId);
                if (dbPlace) {
                    this._log('OK', 'Place details served from DB', { placeId: normalizedPlaceId });
                    this.placeDetailsCache.set(normalizedPlaceId, createCacheEntry(dbPlace, PLACE_DETAILS_CACHE_TTL_MS));
                    return dbPlace;
                }
            } catch (dbError) {
                this._log('WARN', 'DB details lookup failed, falling back to Google', {
                    error: dbError?.message,
                });
            }
        }

        // 3) Google fallback
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
        const place = normalizeGooglePlace(response.data);

        if (!place) {
            throw createHttpError(404, 'Place details could not be resolved', 'PLACE_NOT_FOUND');
        }

        // 4) Write-through
        this.#persistPlacesToDb([place]);

        this.placeDetailsCache.set(normalizedPlaceId, createCacheEntry(place, PLACE_DETAILS_CACHE_TTL_MS));
        return place;
    }

    // =========================================================
    // USER RECENTS
    // =========================================================

    async getUserRecents({ userId, limit = 5 } = {}) {
        if (!this.placesRepository || !userId) {
            return [];
        }

        return this.placesRepository.getUserRecents({ userId, limit });
    }

    async recordPlaceUsage({ userId, placeId, providerPlaceId, kind = 'recent' } = {}) {
        if (!this.placesRepository || !userId) return;

        let dbPlaceId = placeId;

        // If we only have a Google placeId, look up the DB UUID
        if (!dbPlaceId && providerPlaceId) {
            const dbPlace = await this.placesRepository.findByProviderPlaceId(providerPlaceId);
            dbPlaceId = dbPlace?.dbPlaceId;
        }

        if (dbPlaceId) {
            await this.placesRepository.recordUsage({ userId, placeId: dbPlaceId, kind });
        }
    }

    // =========================================================
    // Private: Google API helpers
    // =========================================================

    async #requestPlaces(endpoint, body, context = {}) {
        const response = await this.#request(
            endpoint,
            body,
            context,
            GOOGLE_PLACES_SEARCH_FIELD_MASK
        );
        const places = Array.isArray(response.data?.places) ? response.data.places : [];

        return places
            .map(normalizeGooglePlace)
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

            this._log('ERR', 'Google Places request failed', {
                endpoint,
                message,
                upstreamStatus,
                ...context,
            });

            throw createHttpError(502, message, 'PLACES_UPSTREAM_ERROR');
        }
    }

    // =========================================================
    // Private: Write-through to DB (fire-and-forget)
    // =========================================================

    #persistPlacesToDb(places) {
        if (!this.placesRepository || !Array.isArray(places) || places.length === 0) {
            return;
        }

        // Fire-and-forget: don't block the response
        Promise.resolve().then(async () => {
            try {
                const toUpsert = places
                    .filter((p) => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
                    .map((p) => ({
                        provider: 'google',
                        providerPlaceId: p.placeId || null,
                        name: p.name,
                        formattedAddress: p.address,
                        latitude: p.latitude,
                        longitude: p.longitude,
                    }));

                if (toUpsert.length > 0) {
                    const results = await this.placesRepository.upsertPlaces(toUpsert);
                    this._log('OK', 'Persisted places to DB', {
                        attempted: toUpsert.length,
                        persisted: results.length,
                    });
                }
            } catch (error) {
                this._log('WARN', 'Write-through DB persist failed (non-fatal)', {
                    error: error?.message,
                });
            }
        });
    }

    _log(level, message, context = {}) {
        if (this.logLine) {
            this.logLine(level, 'PLACES', message, context);
        }
    }
}

module.exports = PlacesService;
