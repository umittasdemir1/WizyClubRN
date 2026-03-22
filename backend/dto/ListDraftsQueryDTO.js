const { createHttpError } = require('../utils/httpError');

class ListDraftsQueryDTO {
    constructor(query) {
        this.query = query && typeof query === 'object' && !Array.isArray(query) ? { ...query } : {};
    }

    validate() {
        if (typeof this.query.userId !== 'string' || !this.query.userId.trim()) {
            throw createHttpError(400, 'userId is required');
        }
    }

    toQuery() {
        this.validate();
        return {
            userId: this.query.userId.trim(),
        };
    }
}

module.exports = ListDraftsQueryDTO;
