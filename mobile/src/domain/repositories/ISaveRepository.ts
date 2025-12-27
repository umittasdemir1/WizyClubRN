export interface ISaveRepository {
    toggleSave(userId: string, videoId: string): Promise<boolean>;
    isSaved(userId: string, videoId: string): Promise<boolean>;
    getSavedVideos(userId: string): Promise<string[]>;
}
