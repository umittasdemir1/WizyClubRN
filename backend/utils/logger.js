const os = require('os');

function createLogger() {
    const colorsEnabled = process.stdout.isTTY && process.env.NO_COLOR !== '1';
    const ansi = {
        reset: '\x1b[0m',
        bold: '\x1b[1m',
        dim: '\x1b[2m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        gray: '\x1b[90m',
    };

    const levelStyle = {
        INFO: ['blue', 'bold'],
        OK: ['green', 'bold'],
        WARN: ['yellow', 'bold'],
        ERR: ['red', 'bold'],
        BOOT: ['magenta', 'bold'],
    };

    function style(text, ...tokens) {
        if (!colorsEnabled || tokens.length === 0) return String(text);
        const prefix = tokens.map((token) => ansi[token] || '').join('');
        return `${prefix}${text}${ansi.reset}`;
    }

    function toLogValue(value) {
        if (value == null) return String(value);
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        try {
            return JSON.stringify(value);
        } catch {
            return '[unserializable]';
        }
    }

    function formatMeta(meta) {
        if (meta == null) return '';
        if (typeof meta === 'string') return meta;
        if (meta instanceof Error) return meta.message;
        if (typeof meta !== 'object') return String(meta);

        return Object.entries(meta)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}=${toLogValue(value)}`)
            .join(' ');
    }

    function formatMethod(method) {
        const normalized = (method || 'GET').toUpperCase();
        const palette = {
            GET: 'cyan',
            POST: 'green',
            PUT: 'yellow',
            PATCH: 'yellow',
            DELETE: 'red',
        };
        return style(normalized.padEnd(6), palette[normalized] || 'blue', 'bold');
    }

    function formatStatus(statusCode) {
        const code = Number(statusCode) || 0;
        let tone = 'red';
        if (code >= 200 && code < 300) tone = 'green';
        else if (code >= 300 && code < 400) tone = 'cyan';
        else if (code >= 400 && code < 500) tone = 'yellow';
        return style(String(code).padStart(3), tone, 'bold');
    }

    function logLine(level, scope, message, meta) {
        const ts = style(new Date().toISOString(), 'dim');
        const levelLabel = style(level.padEnd(4), ...(levelStyle[level] || ['cyan', 'bold']));
        const scopeLabel = scope ? style(`[${scope}]`, 'cyan') : '';
        const metaText = formatMeta(meta);
        const line = `${ts} ${levelLabel} ${scopeLabel} ${message}${metaText ? ` | ${metaText}` : ''}`;

        if (level === 'ERR') {
            console.error(line);
            return;
        }

        console.log(line);
    }

    function logBanner(title, lines = []) {
        const border = style('='.repeat(86), 'gray');
        console.log(`\n${border}`);
        console.log(style(title, 'bold', 'cyan'));
        for (const line of lines) {
            console.log(`${style(' -', 'dim')} ${line}`);
        }
        console.log(`${border}\n`);
    }

    function createRequestLogger() {
        return function requestLogger(req, res, next) {
            const startedAt = process.hrtime.bigint();
            res.on('finish', () => {
                const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
                const ts = style(new Date().toISOString(), 'dim');
                const duration = style(`${durationMs.toFixed(1)}ms`, 'dim');
                const route = req.originalUrl || req.url;
                console.log(`${ts} ${formatMethod(req.method)} ${route} ${formatStatus(res.statusCode)} ${duration}`);
            });
            next();
        };
    }

    function getPrimaryIpv4Address() {
        const interfaces = os.networkInterfaces();
        for (const iface of Object.values(interfaces)) {
            if (!iface) continue;
            const match = iface.find((entry) => entry.family === 'IPv4' && !entry.internal);
            if (match?.address) return match.address;
        }
        return null;
    }

    return {
        logLine,
        logBanner,
        createRequestLogger,
        getPrimaryIpv4Address,
    };
}

module.exports = {
    createLogger,
};
