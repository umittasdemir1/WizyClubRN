function safeParseJsonArray(value, fallback = [], onError) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value !== 'string' || !value.trim()) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        if (typeof onError === 'function') {
            onError(error);
        }
        return fallback;
    }
}

module.exports = {
    safeParseJsonArray,
};
