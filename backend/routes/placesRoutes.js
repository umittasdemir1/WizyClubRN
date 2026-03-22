const express = require('express');
const { createHttpError } = require('../utils/httpError');

const parseRequiredCoordinate = (value, fieldName) => {
    const parsed = Number.parseFloat(String(value));

    if (!Number.isFinite(parsed)) {
        throw createHttpError(400, `${fieldName} must be a valid number`);
    }

    return parsed;
};

const parseOptionalCoordinate = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePositiveNumber = (value, fallback) => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function createPlacesRoutes({ placesService, logLine }) {
    const router = express.Router();

    // -------------------------------------------------------
    // GET /places/nearby
    // DB-first → Google fallback
    // -------------------------------------------------------
    router.get('/places/nearby', async (req, res) => {
        try {
            const latitude = parseRequiredCoordinate(req.query.latitude, 'latitude');
            const longitude = parseRequiredCoordinate(req.query.longitude, 'longitude');
            const radiusMeters = parsePositiveNumber(req.query.radiusMeters, undefined);
            const limit = parsePositiveNumber(req.query.limit, undefined);
            const places = await placesService.searchNearby({
                latitude,
                longitude,
                radiusMeters,
                limit,
            });

            return res.json({ success: true, data: { places } });
        } catch (error) {
            logLine('ERR', 'PLACES', 'Failed to fetch nearby places', {
                error: error?.message || error,
            });
            return res
                .status(error?.statusCode || 500)
                .json({ success: false, error: error?.message || 'Failed to fetch nearby places' });
        }
    });

    // -------------------------------------------------------
    // GET /places/autocomplete
    // DB-first → Google fallback
    // -------------------------------------------------------
    router.get('/places/autocomplete', async (req, res) => {
        try {
            const query = String(req.query.q || req.query.query || '').trim();
            if (!query) {
                throw createHttpError(400, 'query is required');
            }

            const latitude = parseOptionalCoordinate(req.query.latitude);
            const longitude = parseOptionalCoordinate(req.query.longitude);
            const radiusMeters = parsePositiveNumber(req.query.radiusMeters, undefined);
            const limit = parsePositiveNumber(req.query.limit, undefined);
            const sessionToken = String(req.query.sessionToken || '').trim() || undefined;
            const predictions = await placesService.autocomplete({
                query,
                latitude,
                longitude,
                radiusMeters,
                limit,
                sessionToken,
            });

            return res.json({ success: true, data: { predictions } });
        } catch (error) {
            logLine('ERR', 'PLACES', 'Failed to autocomplete places', {
                error: error?.message || error,
            });
            return res
                .status(error?.statusCode || 500)
                .json({ success: false, error: error?.message || 'Failed to autocomplete places' });
        }
    });

    // -------------------------------------------------------
    // GET /places/details/:placeId
    // cache → DB → Google fallback
    // -------------------------------------------------------
    router.get('/places/details/:placeId', async (req, res) => {
        try {
            const placeId = String(req.params.placeId || '').trim();
            if (!placeId) {
                throw createHttpError(400, 'placeId is required');
            }

            const sessionToken = String(req.query.sessionToken || '').trim() || undefined;
            const place = await placesService.getPlaceDetails({
                placeId,
                sessionToken,
            });

            return res.json({ success: true, data: { place } });
        } catch (error) {
            logLine('ERR', 'PLACES', 'Failed to fetch place details', {
                error: error?.message || error,
            });
            return res
                .status(error?.statusCode || 500)
                .json({ success: false, error: error?.message || 'Failed to fetch place details' });
        }
    });

    // -------------------------------------------------------
    // GET /places/recents
    // User's recently selected places
    // -------------------------------------------------------
    router.get('/places/recents', async (req, res) => {
        try {
            const userId = String(req.query.userId || '').trim();
            if (!userId) {
                throw createHttpError(400, 'userId is required');
            }

            const limit = parsePositiveNumber(req.query.limit, 5);
            const recents = await placesService.getUserRecents({ userId, limit });

            return res.json({ success: true, data: { places: recents } });
        } catch (error) {
            logLine('ERR', 'PLACES', 'Failed to fetch recent places', {
                error: error?.message || error,
            });
            return res
                .status(error?.statusCode || 500)
                .json({ success: false, error: error?.message || 'Failed to fetch recent places' });
        }
    });

    // -------------------------------------------------------
    // POST /places/usage
    // Record that a user selected a place
    // -------------------------------------------------------
    router.post('/places/usage', async (req, res) => {
        try {
            const userId = String(req.body.userId || '').trim();
            const providerPlaceId = String(req.body.providerPlaceId || req.body.placeId || '').trim();
            const kind = String(req.body.kind || 'recent').trim();

            if (!userId) {
                throw createHttpError(400, 'userId is required');
            }

            if (!providerPlaceId) {
                throw createHttpError(400, 'providerPlaceId is required');
            }

            await placesService.recordPlaceUsage({
                userId,
                providerPlaceId,
                kind,
            });

            return res.json({ success: true });
        } catch (error) {
            logLine('ERR', 'PLACES', 'Failed to record place usage', {
                error: error?.message || error,
            });
            return res
                .status(error?.statusCode || 500)
                .json({ success: false, error: error?.message || 'Failed to record place usage' });
        }
    });

    return router;
}

module.exports = {
    createPlacesRoutes,
};
