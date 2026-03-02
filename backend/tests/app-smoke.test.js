const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createApp } = require('../bootstrap/createApp');

function createNoopRequestLogger() {
    return function noopRequestLogger(req, res, next) {
        next();
    };
}

async function withServer(app, run) {
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        await run(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
}

test('createApp mounts base and /api/v1 route aliases', async () => {
    const healthRouter = express.Router();
    healthRouter.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    const app = createApp({
        routes: { healthRouter },
        logLine: () => {},
        createRequestLogger: createNoopRequestLogger,
    });

    await withServer(app, async (baseUrl) => {
        const rootResponse = await fetch(`${baseUrl}/health`);
        const versionedResponse = await fetch(`${baseUrl}/api/v1/health`);

        assert.equal(rootResponse.status, 200);
        assert.equal(versionedResponse.status, 200);
        assert.deepEqual(await rootResponse.json(), { status: 'ok' });
        assert.deepEqual(await versionedResponse.json(), { status: 'ok' });
    });
});

test('createApp attaches the global error handler', async () => {
    const boomRouter = express.Router();
    boomRouter.get('/boom', (req, res, next) => {
        const error = new Error('boom');
        error.statusCode = 418;
        error.code = 'BOOM';
        next(error);
    });

    const app = createApp({
        routes: { boomRouter },
        logLine: () => {},
        createRequestLogger: createNoopRequestLogger,
    });

    await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/boom`);
        const payload = await response.json();

        assert.equal(response.status, 418);
        assert.equal(payload.error, 'boom');
        assert.equal(payload.code, 'BOOM');
    });
});
