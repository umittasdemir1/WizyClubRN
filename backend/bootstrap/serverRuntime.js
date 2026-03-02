const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

function configureMediaBinaries({ ffmpeg, logLine }) {
    const ffmpegStatic = require('ffmpeg-static');
    const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;

    logLine('OK', 'BOOT', 'FFmpeg binary loaded', { path: ffmpegStatic });
    logLine('OK', 'BOOT', 'FFprobe binary loaded', { path: ffprobeStatic });

    ffmpeg.setFfmpegPath(ffmpegStatic);
    ffmpeg.setFfprobePath(ffprobeStatic);
}

function mountOpenApiDocs({ app, openApiPath }) {
    const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

function registerGracefulShutdown({ server, logLine, timeoutMs = 10000 }) {
    let isShuttingDown = false;

    function gracefulShutdown(signal) {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logLine('WARN', 'SHUTDOWN', 'Shutdown signal received', { signal });

        const forceExitTimer = setTimeout(() => {
            logLine('ERR', 'SHUTDOWN', 'Forced shutdown timeout reached', { signal });
            process.exit(1);
        }, timeoutMs);

        if (typeof forceExitTimer?.unref === 'function') {
            forceExitTimer.unref();
        }

        server.close(() => {
            clearTimeout(forceExitTimer);
            logLine('OK', 'SHUTDOWN', 'HTTP server closed gracefully', { signal });
            process.exit(0);
        });
    }

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

module.exports = {
    configureMediaBinaries,
    mountOpenApiDocs,
    registerGracefulShutdown,
};
