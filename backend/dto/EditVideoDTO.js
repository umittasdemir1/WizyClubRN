const { createHttpError } = require('../utils/httpError');

class EditVideoDTO {
    constructor(body) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
    }

    validate() {
        if (this.body.tags !== undefined && !Array.isArray(this.body.tags)) {
            throw createHttpError(400, 'tags must be an array when provided');
        }

        if (this.body.taggedPeople !== undefined && !Array.isArray(this.body.taggedPeople)) {
            throw createHttpError(400, 'taggedPeople must be an array when provided');
        }
    }

    toBody() {
        this.validate();

        const normalizedBody = { ...this.body };
        const trimFields = [
            'description',
            'commercialType',
            'brandName',
            'brandUrl',
            'subtitleOperation',
            'subtitleId',
            'subtitleLanguage',
        ];

        for (const field of trimFields) {
            if (typeof normalizedBody[field] === 'string') {
                normalizedBody[field] = normalizedBody[field].trim();
            }
        }

        return normalizedBody;
    }
}

module.exports = EditVideoDTO;
