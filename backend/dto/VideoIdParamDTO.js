const { createHttpError } = require('../utils/httpError');

class VideoIdParamDTO {
    constructor(params) {
        this.params = params && typeof params === 'object' && !Array.isArray(params) ? { ...params } : {};
    }

    validate() {
        if (typeof this.params.id !== 'string' || !this.params.id.trim()) {
            throw createHttpError(400, 'video id is required');
        }
    }

    toParams() {
        this.validate();
        return {
            id: this.params.id.trim(),
        };
    }
}

module.exports = VideoIdParamDTO;
