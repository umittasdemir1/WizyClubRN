function parseStoredSubtitlePayload(value) {
    if (Array.isArray(value)) {
        return {
            isEnvelope: false,
            segments: value,
            presentation: null,
            style: null,
            source: null,
        };
    }

    if (value && typeof value === 'object') {
        return {
            isEnvelope: true,
            segments: Array.isArray(value.segments) ? value.segments : [],
            presentation: value.presentation && typeof value.presentation === 'object' ? value.presentation : null,
            style: value.style && typeof value.style === 'object' ? value.style : null,
            source: typeof value.source === 'string' ? value.source : null,
        };
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parseStoredSubtitlePayload(parsed);
        } catch {
            return {
                isEnvelope: false,
                segments: [],
                presentation: null,
                style: null,
                source: null,
            };
        }
    }

    return {
        isEnvelope: false,
        segments: [],
        presentation: null,
        style: null,
        source: null,
    };
}

module.exports = {
    parseStoredSubtitlePayload,
};
