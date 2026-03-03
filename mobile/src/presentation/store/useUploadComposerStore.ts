import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as ImagePicker from 'expo-image-picker';
import { SubtitlePresentation, SubtitleSegment, SubtitleStyle } from '../../domain/entities/Subtitle';
import type { User } from '../../domain/entities/User';

export type UploadComposerQuality = 'low' | 'medium' | 'high';
export type UploadComposerSubtitleLanguage = 'auto' | 'tr-TR' | 'en-US' | 'none';
export type UploadComposerCropRatio = '9:16' | '1:1' | '16:9';
export type UploadComposerFilterPreset = 'none' | 'warm' | 'cool' | 'mono';

export interface SubtitleCacheEntry {
    segments: SubtitleSegment[];
    timestamp: number;
}

export type UploadComposerTaggedUser = Pick<
    User,
    'id' | 'username' | 'fullName' | 'avatarUrl' | 'isVerified' | 'followersCount'
>;

export interface UploadComposerDraft {
    selectedAssets: ImagePicker.ImagePickerAsset[];
    uploadMode: 'story' | 'video';
    coverAssetIndex: number;
    coverTimeSec?: number;
    selectedThumbnailUri?: string;
    playbackRate: number;
    videoVolume: number;
    cropRatio: UploadComposerCropRatio;
    filterPreset: UploadComposerFilterPreset;
    qualityPreset: UploadComposerQuality;
    subtitleLanguage: UploadComposerSubtitleLanguage;
    trimStartSec: number;
    trimEndSec: number;
    taggedPeople?: UploadComposerTaggedUser[];
    editVideoId?: string;
    editVideoUrl?: string;
    editThumbnailUrl?: string;
    editDescription?: string;
    editCommercialType?: string;
    editBrandName?: string;
    editBrandUrl?: string;
    editTags?: string[];
    editTaggedPeople?: UploadComposerTaggedUser[];
}

export type SubtitleSttState = 'loading' | 'ready' | 'no_audio' | 'error';

interface UploadComposerState {
    draft: UploadComposerDraft | null;
    coverPreviewSource: unknown | null;
    subtitleCache: Record<string, SubtitleCacheEntry>;
    subtitlePresentationCache: Record<string, SubtitlePresentation>;
    subtitleStyleCache: Record<string, SubtitleStyle>;
    subtitleSttState: Record<string, SubtitleSttState>;
    setDraft: (draft: UploadComposerDraft) => void;
    clearDraft: () => void;
    setCoverPreviewSource: (source: unknown | null) => void;
    updateSubtitleCache: (uri: string, segments: SubtitleSegment[]) => void;
    updateSubtitlePresentation: (uri: string, presentation: SubtitlePresentation) => void;
    updateSubtitleStyle: (uri: string, style: SubtitleStyle) => void;
    removeSubtitleData: (uri: string) => void;
    setSubtitleSttState: (uri: string, state: SubtitleSttState) => void;
    clearCache: () => void;
}

export const useUploadComposerStore = create<UploadComposerState>()(
    persist(
        (set) => ({
            draft: null,
            coverPreviewSource: null,
            subtitleCache: {},
            subtitlePresentationCache: {},
            subtitleStyleCache: {},
            subtitleSttState: {},
            setDraft: (draft) => set({ draft, coverPreviewSource: null }),
            clearDraft: () => set({ draft: null, coverPreviewSource: null }),
            setCoverPreviewSource: (coverPreviewSource) => set({ coverPreviewSource }),
            updateSubtitleCache: (uri, segments) => set((state) => ({
                subtitleCache: {
                    ...state.subtitleCache,
                    [uri]: { segments, timestamp: Date.now() }
                },
                subtitleSttState: {
                    ...state.subtitleSttState,
                    [uri]: 'ready',
                }
            })),
            updateSubtitlePresentation: (uri, presentation) => set((state) => ({
                subtitlePresentationCache: {
                    ...state.subtitlePresentationCache,
                    [uri]: presentation,
                },
            })),
            updateSubtitleStyle: (uri, style) => set((state) => ({
                subtitleStyleCache: {
                    ...state.subtitleStyleCache,
                    [uri]: style,
                },
            })),
            removeSubtitleData: (uri) => set((state) => {
                const nextSubtitleCache = { ...state.subtitleCache };
                const nextPresentationCache = { ...state.subtitlePresentationCache };
                const nextStyleCache = { ...state.subtitleStyleCache };
                const nextSttState = { ...state.subtitleSttState };
                delete nextSubtitleCache[uri];
                delete nextPresentationCache[uri];
                delete nextStyleCache[uri];
                delete nextSttState[uri];
                return {
                    subtitleCache: nextSubtitleCache,
                    subtitlePresentationCache: nextPresentationCache,
                    subtitleStyleCache: nextStyleCache,
                    subtitleSttState: nextSttState,
                };
            }),
            setSubtitleSttState: (uri, nextState) => set((state) => ({
                subtitleSttState: {
                    ...state.subtitleSttState,
                    [uri]: nextState,
                }
            })),
            clearCache: () => set({
                subtitleCache: {},
                subtitlePresentationCache: {},
                subtitleStyleCache: {},
                subtitleSttState: {},
            }),
        }),
        {
            name: 'upload-composer-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                draft: state.draft,
                subtitleCache: state.subtitleCache,
                subtitlePresentationCache: state.subtitlePresentationCache,
                subtitleStyleCache: state.subtitleStyleCache,
                subtitleSttState: state.subtitleSttState,
            }),
        }
    )
);
