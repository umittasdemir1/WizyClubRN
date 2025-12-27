import { Story } from '../../domain/entities/Story';

export class StoryMapper {
    static toEntity(dto: any): Story {
        return {
            id: dto.id,
            videoUrl: dto.videoUrl,
            thumbnailUrl: dto.thumbnailUrl,
            createdAt: dto.createdAt,
            expiresAt: dto.expiresAt,
            isViewed: dto.isViewed,
            user: {
                id: dto.user.id,
                username: dto.user.username,
                avatarUrl: dto.user.avatarUrl,
                isFollowing: dto.user.isFollowing,
            },
        };
    }
}
