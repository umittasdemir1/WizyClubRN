const { createHttpError } = require('../utils/httpError');

class CreateDraftDTO {
    constructor(body) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
    }

    validate() {
        const { userId, mediaUri, mediaType } = this.body;
        if (
            typeof userId !== 'string' || !userId.trim()
            || typeof mediaUri !== 'string' || !mediaUri.trim()
            || typeof mediaType !== 'string' || !mediaType.trim()
        ) {
            throw createHttpError(400, 'userId, mediaUri, and mediaType are required');
        }
    }

    toBody() {
        this.validate();
        return {
            ...this.body,
            userId: this.body.userId.trim(),
            mediaUri: this.body.mediaUri.trim(),
            mediaType: this.body.mediaType.trim(),
        };
    }
}

module.exports = CreateDraftDTO;
