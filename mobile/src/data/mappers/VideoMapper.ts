import { Video } from '../../domain/entities/Video';

// Since our mock data is already in the shape of Entities (mostly),
// this mapper might seem redundant, but it's crucial for Clean Architecture
// when we eventually switch to a real API that returns DTOs.

export class VideoMapper {
    static toEntity(dto: any): Video {
        return {
            id: dto.id,
            videoUrl: dto.videoUrl,
            thumbnailUrl: dto.thumbnailUrl,
            description: dto.description,
            likesCount: dto.likesCount,
            commentsCount: dto.commentsCount,
            sharesCount: dto.sharesCount,
            shopsCount: dto.shopsCount || 0,
            spriteUrl: dto.sprite_url, // Sprite sheet for seekbar thumbnails
            isLiked: dto.isLiked,
            isSaved: dto.isSaved,
            savesCount: dto.savesCount,
            user: {
                id: dto.user.id,
                username: dto.user.username,
                avatarUrl: dto.user.avatarUrl,
                isFollowing: dto.user.isFollowing,
            },
            musicName: dto.musicName,
            musicAuthor: dto.musicAuthor,
        };
    }
}
