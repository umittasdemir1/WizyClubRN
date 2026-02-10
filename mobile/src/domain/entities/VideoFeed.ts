import { Video } from './Video';

export interface VideoFeedCursor {
  createdAt: string;
  id: string;
}

export interface VideoFeedResult {
  videos: Video[];
  nextCursor: VideoFeedCursor | null;
}
