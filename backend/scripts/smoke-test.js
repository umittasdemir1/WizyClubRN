#!/usr/bin/env node
require('dotenv').config();

const { createProductionApp } = require('../bootstrap/createProductionApp');

async function runSmokeChecks(baseUrl) {
    const checks = [
        { name: 'health', path: '/health', expectedMin: 200, expectedMax: 299 },
        { name: 'health-v1', path: '/api/v1/health', expectedMin: 200, expectedMax: 299 },
        { name: 'progress', path: '/upload-progress/smoke', expectedMin: 200, expectedMax: 299 },
        { name: 'progress-v1', path: '/api/v1/upload-progress/smoke', expectedMin: 200, expectedMax: 299 },
        { name: 'docs', path: '/docs', expectedMin: 200, expectedMax: 399 },
    ];

    const results = [];

    for (const check of checks) {
        const response = await fetch(`${baseUrl}${check.path}`, {
            redirect: 'manual',
        });
        const ok = response.status >= check.expectedMin && response.status <= check.expectedMax;

        results.push({
            ...check,
            status: response.status,
            ok,
        });

        if (!ok) {
            throw new Error(`Smoke check failed for ${check.path}: status=${response.status}`);
        }
    }

    return results;
}

async function main() {
    let server;

    try {
        const {
            app,
            envConfig,
        } = createProductionApp();

        server = await new Promise((resolve) => {
            const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
        });

        const address = server.address();
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const results = await runSmokeChecks(baseUrl);

        console.log('Smoke test passed');
        console.log(`Port: ${address.port}`);
        console.log(`R2 Bucket: ${envConfig.r2BucketName}`);
        for (const result of results) {
            console.log(` - ${result.name}: ${result.status} ${result.path}`);
        }

        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
        server = null;
        return;
    } catch (error) {
        console.error(`Smoke test failed: ${error?.message || error}`);
        process.exitCode = 1;
    } finally {
        if (server) {
            try {
                await new Promise((resolve) => {
                    server.close(() => resolve());
                });
            } catch {}
        }
    }
}

main();
