export interface Draft {
  id: string;
  userId: string;

  // Media
  mediaUri: string;
  mediaType: 'video' | 'image';
  thumbnailUri?: string;

  // Metadata
  description?: string;
  commercialType?: string;
  brandName?: string;
  brandUrl?: string;
  tags?: string[];
  useAILabel?: boolean;
  uploadMode: 'video' | 'story';

  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt: string;

  // Computed
  isExpired?: boolean;
  daysUntilExpiration?: number;
}
