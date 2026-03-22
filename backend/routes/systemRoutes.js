const express = require('express');
const { createHttpError } = require('../utils/httpError');

function createSystemRoutes({ migrateAssetsUseCase, logLine, requireAuth, migrationOwnerUserId }) {
    const router = express.Router();

    router.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    router.get('/migrate-assets', requireAuth, async (req, res) => {
        try {
            if (migrationOwnerUserId && req.user?.id !== migrationOwnerUserId) {
                throw createHttpError(403, 'Forbidden');
            }
            const result = await migrateAssetsUseCase.execute();
            return res.json({ success: true, ...result });
        } catch (error) {
            logLine('ERR', 'MIGRATION', 'Migration endpoint failed', { error: error?.message || error });
            return res.status(error?.statusCode || 500).json({ success: false, error: error.message });
        }
    });

    return router;
}

module.exports = {
    createSystemRoutes,
};
