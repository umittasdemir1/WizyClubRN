function normalizeTagsField(value) {
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

function toDraftRecord(row) {
    if (!row || typeof row !== 'object') {
        return row;
    }

    return {
        ...row,
        tags: normalizeTagsField(row.tags),
    };
}

function toDraftInsertPayload(input) {
    return {
        user_id: input.userId,
        media_uri: input.mediaUri,
        media_type: input.mediaType,
        thumbnail_uri: input.thumbnailUri || null,
        description: input.description || null,
        commercial_type: input.commercialType || null,
        brand_name: input.brandName || null,
        brand_url: input.brandUrl || null,
        tags: Array.isArray(input.tags) ? input.tags : [],
        use_ai_label: Boolean(input.useAILabel),
        upload_mode: input.uploadMode || 'video',
    };
}

function toDraftUpdatePayload(input) {
    const payload = {};

    if (input.description !== undefined) payload.description = input.description;
    if (input.commercialType !== undefined) payload.commercial_type = input.commercialType;
    if (input.brandName !== undefined) payload.brand_name = input.brandName;
    if (input.brandUrl !== undefined) payload.brand_url = input.brandUrl;
    if (input.tags !== undefined) payload.tags = input.tags;
    if (input.useAILabel !== undefined) payload.use_ai_label = input.useAILabel;

    return payload;
}

module.exports = {
    normalizeTagsField,
    toDraftRecord,
    toDraftInsertPayload,
    toDraftUpdatePayload,
};
