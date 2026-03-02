class DeleteSubtitleQueryDTO {
    constructor(query) {
        this.query = query && typeof query === 'object' && !Array.isArray(query) ? { ...query } : {};
    }

    toQuery() {
        const subtitleId = typeof this.query.subtitleId === 'string' && this.query.subtitleId.trim()
            ? this.query.subtitleId.trim()
            : null;
        const language = typeof this.query.language === 'string' && this.query.language.trim()
            ? this.query.language.trim()
            : null;

        return {
            subtitleId,
            language,
        };
    }
}

module.exports = DeleteSubtitleQueryDTO;
