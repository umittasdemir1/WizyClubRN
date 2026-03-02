const express = require('express');
const cors = require('cors');
const { createErrorHandler } = require('../middleware/errorHandler');

function mountApiRoute(app, router) {
    app.use(router);
    app.use('/api/v1', router);
}

function createApp({
    routes,
    logLine,
    createRequestLogger,
    mountOpenApiDocs,
    openApiPath,
}) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    if (typeof createRequestLogger === 'function') {
        app.use(createRequestLogger());
    }

    if (typeof mountOpenApiDocs === 'function' && openApiPath) {
        mountOpenApiDocs({ app, openApiPath });
    }

    for (const router of Object.values(routes || {})) {
        if (!router) continue;
        mountApiRoute(app, router);
    }

    app.use(createErrorHandler(logLine));
    return app;
}

module.exports = {
    createApp,
    mountApiRoute,
};
