const { createClient } = require('@supabase/supabase-js');
const { createHttpError } = require('../utils/httpError');

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(authHeader) {
    if (typeof authHeader !== 'string' || !authHeader.startsWith(BEARER_PREFIX)) {
        return null;
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    return token || null;
}

function createAuthenticatedDbClient(token, envConfig) {
    if (!token || !envConfig?.supabaseUrl || !envConfig?.supabaseAuthKey) {
        return null;
    }

    return createClient(envConfig.supabaseUrl, envConfig.supabaseAuthKey, {
        global: {
            headers: {
                Authorization: `${BEARER_PREFIX}${token}`,
            },
        },
    });
}

function attachAuthState(req, user, token, envConfig) {
    req.authToken = token;
    req.user = user;
    req.dbClient = createAuthenticatedDbClient(token, envConfig);
}

function createRequireAuth(supabase, envConfig) {
    return async function requireAuth(req, res, next) {
        try {
            const token = extractBearerToken(req.headers.authorization);
            if (!token) {
                throw createHttpError(401, 'Authorization header required');
            }

            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) {
                throw createHttpError(401, 'Invalid or expired token');
            }

            attachAuthState(req, user, token, envConfig);
            next();
        } catch (error) {
            next(error);
        }
    };
}

function createAttachOptionalAuth(supabase, envConfig) {
    return async function attachOptionalAuth(req, res, next) {
        try {
            const token = extractBearerToken(req.headers.authorization);
            if (!token) {
                req.authToken = null;
                req.user = null;
                req.dbClient = null;
                return next();
            }

            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) {
                throw createHttpError(401, 'Invalid or expired token');
            }

            attachAuthState(req, user, token, envConfig);
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    createRequireAuth,
    createAttachOptionalAuth,
};
