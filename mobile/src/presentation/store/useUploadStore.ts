import { create } from 'zustand';
import type { VideoTaggedPerson } from '../../domain/entities/Video';

export interface UploadedVideoPayload {
    id: string;
    user_id: string;
    video_url: string;
    thumbnail_url?: string | null;
    description?: string | null;
    likes_count?: number | null;
    views_count?: number | null;
    shares_count?: number | null;
    saves_count?: number | null;
    shops_count?: number | null;
    created_at?: string;
    sprite_url?: string | null;
    width?: number | null;
    height?: number | null;
    is_commercial?: boolean | null;
    brand_name?: string | null;
    brand_url?: string | null;
    commercial_type?: string | null;
    location_name?: string | null;
    location_address?: string | null;
    location_latitude?: number | null;
    location_longitude?: number | null;
    media_urls?: unknown[];
    post_type?: 'video' | 'carousel';
    profiles?: {
        username?: string;
        full_name?: string;
        avatar_url?: string;
        country?: string;
        age?: number;
        bio?: string;
        is_verified?: boolean;
        shop_enabled?: boolean;
        followers_count?: number;
        following_count?: number;
        posts_count?: number;
        instagram_url?: string;
        tiktok_url?: string;
        youtube_url?: string;
        x_url?: string;
        website?: string;
    } | null;
}

interface UploadState {
    isUploading: boolean;
    progress: number; // 0-100
    status: 'idle' | 'compressing' | 'uploading' | 'processing' | 'success' | 'error';
    uploadedVideoId: string | null;
    uploadedVideoPayload: UploadedVideoPayload | null;
    uploadSuccessConsumed: boolean;
    thumbnailUri: string | null; // 🔥 For showing thumbnail during upload
    taggedPeoplePreview: VideoTaggedPerson[];
    error: string | null;

    startUpload: () => void;
    setProgress: (progress: number) => void;
    setStatus: (status: UploadState['status']) => void;
    setThumbnailUri: (uri: string | null) => void; // 🔥 New
    setTaggedPeoplePreview: (taggedPeople: VideoTaggedPerson[]) => void;
    setSuccess: (videoId: string, payload?: UploadedVideoPayload | null) => void;
    setError: (error: string) => void;
    tryConsumeUploadSuccess: (videoId: string) => boolean;
    reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
    isUploading: false,
    progress: 0,
    status: 'idle',
    uploadedVideoId: null,
    uploadedVideoPayload: null,
    uploadSuccessConsumed: false,
    thumbnailUri: null,
    taggedPeoplePreview: [],
    error: null,

    startUpload: () => set({
        isUploading: true,
        progress: 0,
        status: 'compressing',
        uploadedVideoId: null,
        uploadedVideoPayload: null,
        uploadSuccessConsumed: false,
        error: null,
    }),
    setProgress: (progress) => set({ progress }),
    setStatus: (status) => set({ status }),
    setThumbnailUri: (uri) => set({ thumbnailUri: uri }),
    setTaggedPeoplePreview: (taggedPeople) => set({ taggedPeoplePreview: taggedPeople }),
    setSuccess: (videoId, payload = null) => set({
        isUploading: false,
        status: 'success',
        uploadedVideoId: videoId,
        uploadedVideoPayload: payload,
        uploadSuccessConsumed: false,
        progress: 100,
    }),
    setError: (error) => set({
        isUploading: false,
        status: 'error',
        uploadedVideoPayload: null,
        uploadSuccessConsumed: false,
        error,
    }),
    tryConsumeUploadSuccess: (videoId) => {
        let consumed = false;
        set((state) => {
            const canConsume = (
                state.status === 'success'
                && state.uploadedVideoId === videoId
                && !state.uploadSuccessConsumed
            );
            consumed = canConsume;
            if (!canConsume) {
                return state;
            }
            return {
                ...state,
                uploadSuccessConsumed: true,
            };
        });
        return consumed;
    },
    reset: () => set({
        isUploading: false,
        progress: 0,
        status: 'idle',
        uploadedVideoId: null,
        uploadedVideoPayload: null,
        uploadSuccessConsumed: false,
        thumbnailUri: null,
        taggedPeoplePreview: [],
        error: null,
    }),
}));
