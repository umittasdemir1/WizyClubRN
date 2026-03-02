const { createHttpError } = require('../utils/httpError');

class UploadAvatarDTO {
    constructor(body, file) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
        this.file = file || null;
    }

    validate() {
        if (!this.file) {
            throw createHttpError(400, 'Missing image or userId');
        }

        if (typeof this.body.userId !== 'string' || this.body.userId.trim().length === 0) {
            throw createHttpError(400, 'Missing image or userId');
        }
    }

    toRequest() {
        this.validate();

        return {
            file: this.file,
            userId: this.body.userId.trim(),
        };
    }
}

module.exports = UploadAvatarDTO;
