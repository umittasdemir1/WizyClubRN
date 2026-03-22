class GenerateSubtitlesDTO {
    constructor(body) {
        this.body = body && typeof body === 'object' && !Array.isArray(body) ? { ...body } : {};
    }

    toBody() {
        return {
            language: typeof this.body.language === 'string' && this.body.language.trim()
                ? this.body.language.trim()
                : 'auto',
        };
    }
}

module.exports = GenerateSubtitlesDTO;
