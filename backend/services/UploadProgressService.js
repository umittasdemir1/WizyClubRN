class UploadProgressService {
    constructor() {
        this.progress = new Map();
    }

    get(id) {
        return this.progress.get(id) || { stage: 'unknown', percent: 0 };
    }

    set(id, stage, percent) {
        this.progress.set(id, { stage, percent });
        return this.progress.get(id);
    }
}

module.exports = UploadProgressService;
