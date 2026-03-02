function normalizeMediaUrlsField(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function toVideoRecord(row) {
    if (!row || typeof row !== 'object') {
        return row;
    }

    return {
        ...row,
        media_urls: normalizeMediaUrlsField(row.media_urls),
    };
}

function toVideoInsertPayload(input) {
    return {
        user_id: input.userId,
        video_url: input.videoUrl,
        thumbnail_url: input.thumbnailUrl,
        sprite_url: input.spriteUrl,
        media_urls: Array.isArray(input.mediaUrls) ? input.mediaUrls : [],
        post_type: input.postType,
        description: input.description || '',
        brand_name: input.brandName || null,
        brand_url: input.brandUrl || null,
        commercial_type: input.commercialType || null,
        is_commercial: Boolean(input.isCommercial),
        width: input.width,
        height: input.height,
        processing_status: input.processingStatus || 'completed',
    };
}

module.exports = {
    normalizeMediaUrlsField,
    toVideoRecord,
    toVideoInsertPayload,
};
