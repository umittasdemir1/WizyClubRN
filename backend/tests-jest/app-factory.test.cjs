const express = require('express');
const { createApp } = require('../bootstrap/createApp');

function createNoopRequestLogger() {
    return function noopRequestLogger(req, res, next) {
        next();
    };
}

function withServer(app, run) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, '127.0.0.1', async () => {
            const address = server.address();
            const baseUrl = `http://127.0.0.1:${address.port}`;

            try {
                await run(baseUrl);
                server.close((error) => (error ? reject(error) : resolve()));
            } catch (error) {
                server.close(() => reject(error));
            }
        });
    });
}

test('createApp mounts both root and versioned aliases under Jest', async () => {
    const router = express.Router();
    router.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    const app = createApp({
        routes: { router },
        logLine: () => {},
        createRequestLogger: createNoopRequestLogger,
    });

    await withServer(app, async (baseUrl) => {
        const rootResponse = await fetch(`${baseUrl}/health`);
        const versionedResponse = await fetch(`${baseUrl}/api/v1/health`);

        expect(rootResponse.status).toBe(200);
        expect(versionedResponse.status).toBe(200);
        await expect(rootResponse.json()).resolves.toEqual({ status: 'ok' });
        await expect(versionedResponse.json()).resolves.toEqual({ status: 'ok' });
    });
});
