export const getVideoUrl = (video: { videoUrl?: unknown } | null | undefined): string | null => {
    if (!video || typeof video !== 'object') return null;

    const maybeUrl = (video as { videoUrl?: unknown }).videoUrl;
    if (typeof maybeUrl === 'string') {
        return maybeUrl;
    }

    if (maybeUrl && typeof maybeUrl === 'object' && 'uri' in (maybeUrl as Record<string, unknown>)) {
        const uri = (maybeUrl as { uri?: unknown }).uri;
        return typeof uri === 'string' ? uri : null;
    }

    return null;
};
export const isValidSource = (source: string | undefined | null): source is string => {
    if (!source || typeof source !== 'string') return false;
    if (source.trim() === '') return false;
    // Must be a URL or file path
    return source.startsWith('http://') ||
        source.startsWith('https://') ||
        source.startsWith('file://');
};
