function createErrorHandler(logLine) {
    return function errorHandler(err, req, res, next) {
        if (res.headersSent) {
            return next(err);
        }

        const statusCode = err?.statusCode || 500;
        const code = err?.code || 'INTERNAL_ERROR';
        const message = err?.message || 'Internal server error';

        if (typeof logLine === 'function') {
            logLine('ERR', 'GLOBAL', message, {
                code,
                method: req.method,
                path: req.originalUrl || req.url,
                requestId: req.id,
                stack: err?.stack,
            });
        }

        return res.status(statusCode).json({
            error: message,
            code,
            requestId: req.id,
        });
    };
}

module.exports = {
    createErrorHandler,
};
