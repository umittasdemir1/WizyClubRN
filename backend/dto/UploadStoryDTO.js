const { createHttpError } = require('../utils/httpError');

class UploadStoryDTO {
    constructor(body, files, authenticatedUserId) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
        this.files = Array.isArray(files) ? files : [];
        this.authenticatedUserId = authenticatedUserId || null;
    }

    validate() {
        if (this.files.length === 0) {
            throw createHttpError(400, 'No files provided');
        }

        const bodyUserId = this.body.userId;
        if (
            bodyUserId !== undefined
            && (typeof bodyUserId !== 'string' || bodyUserId.trim().length === 0)
        ) {
            throw createHttpError(400, 'userId must be a non-empty string when provided');
        }

        const effectiveUserId = this.authenticatedUserId || (typeof bodyUserId === 'string' ? bodyUserId.trim() : '');
        if (!effectiveUserId) {
            throw createHttpError(400, 'User ID is required');
        }
    }

    toRequest() {
        this.validate();

        const normalizedBody = { ...this.body };
        if (typeof normalizedBody.userId === 'string') {
            normalizedBody.userId = normalizedBody.userId.trim();
        }

        return {
            body: normalizedBody,
            files: this.files,
            authenticatedUserId: this.authenticatedUserId,
        };
    }
}

module.exports = UploadStoryDTO;
