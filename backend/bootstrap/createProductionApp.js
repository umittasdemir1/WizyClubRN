const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { createApp } = require('./createApp');
const { createServerContext } = require('./createServerContext');
const { configureMediaBinaries, mountOpenApiDocs } = require('./serverRuntime');
const { validateEnv } = require('../config/env');
const { createLogger } = require('../utils/logger');

function createProductionApp(options = {}) {
    const envConfig = validateEnv(options.env || process.env);
    const {
        logLine,
        logBanner,
        createRequestLogger,
        getPrimaryIpv4Address,
    } = createLogger();

    configureMediaBinaries({ ffmpeg, logLine });

    const {
        routes,
        schedulers,
    } = createServerContext({
        envConfig,
        ffmpeg,
        logLine,
        logBanner,
        tempOutputDir: path.join(__dirname, '..', 'temp_uploads'),
    });

    const app = createApp({
        routes,
        logLine,
        createRequestLogger,
        mountOpenApiDocs,
        openApiPath: path.join(__dirname, '..', 'docs', 'openapi.yaml'),
    });

    return {
        app,
        envConfig,
        logLine,
        logBanner,
        getPrimaryIpv4Address,
        schedulers,
    };
}

module.exports = {
    createProductionApp,
};
