class SubtitleListQueryDTO {
    constructor(query) {
        this.query = query && typeof query === 'object' && !Array.isArray(query) ? { ...query } : {};
    }

    toQuery() {
        const language = typeof this.query.language === 'string' && this.query.language.trim()
            ? this.query.language.trim()
            : null;

        return { language };
    }
}

module.exports = SubtitleListQueryDTO;
