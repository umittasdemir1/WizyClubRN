const fs = require('fs');

class R2StorageAdapter {
    constructor({ client, bucketName, publicUrl, cacheControl, putObjectCommand, logLine }) {
        this.client = client;
        this.bucketName = bucketName;
        this.publicUrl = publicUrl;
        this.cacheControl = cacheControl;
        this.PutObjectCommand = putObjectCommand;
        this.logLine = logLine;
    }

    async upload(filePath, fileName, contentType) {
        const fileStream = fs.readFileSync(filePath);
        const maxAttempts = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                await this.client.send(new this.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: fileName,
                    Body: fileStream,
                    ContentType: contentType,
                    CacheControl: this.cacheControl,
                }));
                return `${this.publicUrl}/${fileName}`;
            } catch (error) {
                lastError = error;
                const cause = error?.cause;
                if (typeof this.logLine === 'function') {
                    this.logLine(attempt < maxAttempts ? 'WARN' : 'ERR', 'R2_UPLOAD', 'PutObject failed', {
                        key: fileName,
                        contentType,
                        attempt,
                        maxAttempts,
                        error: error?.message || error,
                        code: error?.code,
                        cause: cause?.message || cause,
                        causeCode: cause?.code,
                    });
                }

                if (attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
                }
            }
        }

        throw lastError;
    }
}

module.exports = R2StorageAdapter;
