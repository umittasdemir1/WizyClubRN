require('dotenv').config();

const { createProductionApp } = require('./bootstrap/createProductionApp');
const { registerGracefulShutdown } = require('./bootstrap/serverRuntime');
const { DEFAULT_PORT } = require('./config/constants');
const {
    app,
    envConfig,
    logLine,
    logBanner,
    getPrimaryIpv4Address,
    schedulers,
} = createProductionApp();

const port = Number.isFinite(envConfig.port) ? envConfig.port : DEFAULT_PORT;
const server = app.listen(port, '0.0.0.0', () => {
    const localAccess = `http://localhost:${port}`;
    const ipAddress = getPrimaryIpv4Address();
    const networkAccess = ipAddress ? `http://${ipAddress}:${port}` : 'unavailable';
    const bindAddress = `http://0.0.0.0:${port}`;

    logBanner('WizyClub Backend Ready', [
        `Bind Address : ${bindAddress}`,
        `Local Access : ${localAccess}`,
        `Network      : ${networkAccess}`,
        `R2 Bucket    : ${envConfig.r2BucketName}`,
        'Status       : Ready to accept uploads',
    ]);

    schedulers.startStoryCleanupScheduler();
    schedulers.startDraftCleanupScheduler();
    schedulers.startSoftDeletedStoryCleanupScheduler();
});

registerGracefulShutdown({ server, logLine });
