const { normalizeMediaUrlsField } = require('./videoMapper');

function toStoryRecord(row) {
    if (!row || typeof row !== 'object') {
        return row;
    }

    return {
        ...row,
        media_urls: normalizeMediaUrlsField(row.media_urls),
    };
}

function toStoryInsertPayload(input) {
    return {
        user_id: input.userId,
        video_url: input.videoUrl,
        thumbnail_url: input.thumbnailUrl,
        media_urls: Array.isArray(input.mediaUrls) ? input.mediaUrls : [],
        post_type: input.postType,
        width: input.width,
        height: input.height,
        is_commercial: Boolean(input.isCommercial),
        brand_name: input.brandName || null,
        brand_url: input.brandUrl || null,
        commercial_type: input.commercialType || null,
        expires_at: input.expiresAt,
    };
}

module.exports = {
    toStoryRecord,
    toStoryInsertPayload,
};
