export interface SocialLink {
    id: string;
    userId: string;
    platform: 'Instagram' | 'TikTok' | 'Youtube' | 'X' | 'Diğer';
    url: string;
    displayOrder: number;
}
