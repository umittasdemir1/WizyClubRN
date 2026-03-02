const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const routesDir = path.join(projectRoot, 'routes');
const serverPath = path.join(projectRoot, 'server.js');
const createServerContextPath = path.join(projectRoot, 'bootstrap', 'createServerContext.js');

test('route layer does not contain direct database calls', () => {
    const routeFiles = fs.readdirSync(routesDir)
        .filter((fileName) => fileName.endsWith('.js'))
        .sort();

    for (const fileName of routeFiles) {
        const filePath = path.join(routesDir, fileName);
        const source = fs.readFileSync(filePath, 'utf8');

        assert.equal(
            /\.from\(|\.rpc\(/.test(source),
            false,
            `Direct DB access leaked back into routes: ${fileName}`
        );
    }
});

test('server entrypoint stays thin after bootstrap extraction', () => {
    const source = fs.readFileSync(serverPath, 'utf8');
    const lineCount = source.split('\n').length;

    assert.equal(
        lineCount <= 150,
        true,
        `server.js grew too large again (${lineCount} lines)`
    );
});

test('createServerContext stays thin after bootstrap split', () => {
    const source = fs.readFileSync(createServerContextPath, 'utf8');
    const lineCount = source.split('\n').length;

    assert.equal(
        lineCount <= 80,
        true,
        `createServerContext.js grew too large again (${lineCount} lines)`
    );
});
