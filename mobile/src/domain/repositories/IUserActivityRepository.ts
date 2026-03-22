import { Video } from '../entities/Video';

export interface IUserActivityRepository {
    getLikedVideos(userId: string): Promise<Video[]>;
    getSavedVideos(userId: string): Promise<Video[]>;
    getWatchHistory(userId: string): Promise<Video[]>;
}
