const { createHttpError } = require('../utils/httpError');

class UploadVideoDTO {
    constructor(body, files) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
        this.files = Array.isArray(files) ? files : [];
    }

    validate() {
        if (this.files.length === 0) {
            throw createHttpError(400, 'No files provided');
        }

        if (
            this.body.userId !== undefined
            && (typeof this.body.userId !== 'string' || this.body.userId.trim().length === 0)
        ) {
            throw createHttpError(400, 'userId must be a non-empty string when provided');
        }
    }

    toRequest() {
        this.validate();

        const normalizedBody = { ...this.body };
        if (typeof normalizedBody.userId === 'string') {
            normalizedBody.userId = normalizedBody.userId.trim();
        }
        if (typeof normalizedBody.subtitleLanguage === 'string') {
            normalizedBody.subtitleLanguage = normalizedBody.subtitleLanguage.trim();
        }

        return {
            body: normalizedBody,
            files: this.files,
        };
    }
}

module.exports = UploadVideoDTO;
