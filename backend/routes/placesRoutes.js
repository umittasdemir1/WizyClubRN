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

    return router;
}

module.exports = {
    createPlacesRoutes,
};
