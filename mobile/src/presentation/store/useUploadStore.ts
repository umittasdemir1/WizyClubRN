import { create } from 'zustand';

interface UploadState {
    isUploading: boolean;
    progress: number; // 0-100
    status: 'idle' | 'compressing' | 'uploading' | 'processing' | 'success' | 'error';
    uploadedVideoId: string | null;
    thumbnailUri: string | null; // 🔥 For showing thumbnail during upload
    error: string | null;

    startUpload: () => void;
    setProgress: (progress: number) => void;
    setStatus: (status: UploadState['status']) => void;
    setThumbnailUri: (uri: string | null) => void; // 🔥 New
    setSuccess: (videoId: string) => void;
    setError: (error: string) => void;
    reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
    isUploading: false,
    progress: 0,
    status: 'idle',
    uploadedVideoId: null,
    thumbnailUri: null,
    error: null,

    startUpload: () => set({ isUploading: true, progress: 0, status: 'compressing', error: null }),
    setProgress: (progress) => set({ progress }),
    setStatus: (status) => set({ status }),
    setThumbnailUri: (uri) => set({ thumbnailUri: uri }),
    setSuccess: (videoId) => set({ isUploading: false, status: 'success', uploadedVideoId: videoId, progress: 100 }),
    setError: (error) => set({ isUploading: false, status: 'error', error }),
    reset: () => set({ isUploading: false, progress: 0, status: 'idle', uploadedVideoId: null, thumbnailUri: null, error: null }),
}));
