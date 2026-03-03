const { createHttpError } = require('../utils/httpError');

/**
 * PlacesRepository – DB-first place storage layer.
 *
 * Wraps Supabase RPCs that were created by the
 * `create_places_tables` migration.
 */
class PlacesRepository {
    constructor({ supabase, logLine } = {}) {
        this.supabase = supabase;
        this.logLine = typeof logLine === 'function' ? logLine : null;
    }

    // -------------------------------------------------------
    // Reads
    // -------------------------------------------------------

    /**
     * Find places near a coordinate within the given radius.
     * Uses PostGIS ST_DWithin under the hood.
     */
    async findNearby({ latitude, longitude, radiusMeters = 1500, limit = 8 }) {
        const { data, error } = await this.supabase.rpc('get_nearby_places', {
            p_latitude: latitude,
            p_longitude: longitude,
            p_radius_meters: radiusMeters,
            p_limit: limit,
        });

        if (error) {
            this._log('ERR', 'DB findNearby failed', { error: error.message });
            return [];
        }

        return (data || []).map(this._normalizeDbPlace);
    }

    /**
     * Search places by name using trigram similarity.
     */
    async searchByName({ query, limit = 6 }) {
        const { data, error } = await this.supabase.rpc('search_places_by_name', {
            p_query: query,
            p_limit: limit,
        });

        if (error) {
            this._log('ERR', 'DB searchByName failed', { error: error.message });
            return [];
        }

        return (data || []).map(this._normalizeDbPlace);
    }

    /**
     * Get a place by its Google place ID.
     */
    async findByProviderPlaceId(providerPlaceId) {
        const { data, error } = await this.supabase
            .from('places')
            .select('id, provider_place_id, name, formatted_address, latitude, longitude, usage_count')
            .eq('provider_place_id', providerPlaceId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        if (error) {
            this._log('ERR', 'DB findByProviderPlaceId failed', { error: error.message });
            return null;
        }

        return data ? this._normalizeDbPlace(data) : null;
    }

    /**
     * Get user's recent places.
     */
    async getUserRecents({ userId, limit = 5 }) {
        const { data, error } = await this.supabase.rpc('get_user_recent_places', {
            p_user_id: userId,
            p_limit: limit,
        });

        if (error) {
            this._log('ERR', 'DB getUserRecents failed', { error: error.message });
            return [];
        }

        return (data || []).map(this._normalizeDbPlace);
    }

    // -------------------------------------------------------
    // Writes
    // -------------------------------------------------------

    /**
     * Upsert a place from Google into the DB.
     * Returns the canonical place UUID.
     */
    async upsertPlace({
        provider = 'google',
        providerPlaceId,
        name,
        formattedAddress,
        latitude,
        longitude,
        city,
        region,
        country,
        metadata,
    }) {
        const { data, error } = await this.supabase.rpc('upsert_place', {
            p_provider: provider,
            p_provider_place_id: providerPlaceId || null,
            p_name: name,
            p_formatted_address: formattedAddress || null,
            p_latitude: latitude,
            p_longitude: longitude,
            p_city: city || null,
            p_region: region || null,
            p_country: country || null,
            p_metadata_json: metadata || null,
        });

        if (error) {
            this._log('ERR', 'DB upsertPlace failed', { error: error.message });
            return null;
        }

        return data; // UUID
    }

    /**
     * Upsert multiple places in parallel.
     * Returns array of { placeId, providerPlaceId } mappings.
     */
    async upsertPlaces(places) {
        const results = await Promise.allSettled(
            places.map(async (place) => {
                const placeId = await this.upsertPlace(place);
                return { placeId, providerPlaceId: place.providerPlaceId };
            })
        );

        return results
            .filter((r) => r.status === 'fulfilled' && r.value.placeId)
            .map((r) => r.value);
    }

    /**
     * Record that a user selected a place.
     */
    async recordUsage({ userId, placeId, kind = 'recent' }) {
        if (!userId || !placeId) return;

        const { error } = await this.supabase.rpc('record_user_place_usage', {
            p_user_id: userId,
            p_place_id: placeId,
            p_kind: kind,
        });

        if (error) {
            this._log('ERR', 'DB recordUsage failed', { error: error.message });
        }
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    _normalizeDbPlace(row) {
        return {
            placeId: row.provider_place_id || undefined,
            dbPlaceId: row.id,
            name: row.name || '',
            address: row.formatted_address || 'Adres bilgisi yok',
            latitude: row.latitude,
            longitude: row.longitude,
            usageCount: row.usage_count,
            distanceMeters: row.distance_meters,
        };
    }

    _log(level, message, context = {}) {
        if (this.logLine) {
            this.logLine(level, 'PLACES_REPO', message, context);
        }
    }
}

module.exports = PlacesRepository;
