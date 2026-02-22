import { DraftRepositoryImpl } from '../../data/repositories/DraftRepositoryImpl';
import { InteractionRepositoryImpl } from '../../data/repositories/InteractionRepositoryImpl';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';
import { StoryRepositoryImpl } from '../../data/repositories/StoryRepositoryImpl';
import { UserActivityRepositoryImpl } from '../../data/repositories/UserActivityRepositoryImpl';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';

import { FeedPrefetchService } from '../../data/services/FeedPrefetchService';
import { VideoCacheService } from '../../data/services/VideoCacheService';

class DIContainer {
    private static instance: DIContainer;

    // Repositories
    public readonly draftRepository: DraftRepositoryImpl;
    public readonly interactionRepository: InteractionRepositoryImpl;
    public readonly profileRepository: ProfileRepositoryImpl;
    public readonly storyRepository: StoryRepositoryImpl;
    public readonly userActivityRepository: UserActivityRepositoryImpl;
    public readonly videoRepository: VideoRepositoryImpl;

    // Services
    public readonly feedPrefetchService: FeedPrefetchService;
    public readonly videoCacheService: VideoCacheService;

    private constructor() {
        // Initialize Repositories
        this.draftRepository = new DraftRepositoryImpl();
        this.interactionRepository = new InteractionRepositoryImpl();
        this.profileRepository = new ProfileRepositoryImpl();
        this.storyRepository = new StoryRepositoryImpl();
        this.userActivityRepository = new UserActivityRepositoryImpl();
        this.videoRepository = new VideoRepositoryImpl();

        // Initialize Services
        this.videoCacheService = new VideoCacheService();
        this.feedPrefetchService = new FeedPrefetchService();
    }

    public static getInstance(): DIContainer {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }
}

export const container = DIContainer.getInstance();
