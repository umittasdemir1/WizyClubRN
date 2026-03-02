const { createHttpError } = require('../utils/httpError');

class UpdateDraftDTO {
    constructor(body) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
    }

    validate() {
        if (this.body.tags !== undefined && !Array.isArray(this.body.tags)) {
            throw createHttpError(400, 'tags must be an array when provided');
        }
    }

    toBody() {
        this.validate();
        return { ...this.body };
    }
}

module.exports = UpdateDraftDTO;
