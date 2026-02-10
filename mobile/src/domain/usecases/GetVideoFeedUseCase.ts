import { VideoFeedCursor, VideoFeedResult } from '../entities/VideoFeed';
import { IVideoRepository } from '../repositories/IVideoRepository';

export class GetVideoFeedUseCase {
    constructor(private videoRepository: IVideoRepository) { }

    async execute(limit: number = 10, userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): Promise<VideoFeedResult> {
        return this.videoRepository.getFeed(limit, userId, authorId, cursor);
    }
}
