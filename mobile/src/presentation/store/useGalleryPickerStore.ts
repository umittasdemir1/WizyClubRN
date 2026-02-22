import { create } from 'zustand';
import type * as ImagePicker from 'expo-image-picker';
import type * as MediaLibrary from 'expo-media-library';

type GalleryFilterKey = 'nearby' | 'photos' | 'videos' | 'all' | 'drafts';

interface GalleryCacheEntry {
    assets: MediaLibrary.Asset[];
    endCursor: string | null;
    hasNextPage: boolean;
    updatedAt: number;
}

interface GalleryPickerState {
    pickedAssets: ImagePicker.ImagePickerAsset[] | null;
    cacheByFilter: Partial<Record<GalleryFilterKey, GalleryCacheEntry>>;
    setPickedAssets: (assets: ImagePicker.ImagePickerAsset[]) => void;
    clearPickedAssets: () => void;
    setFilterCache: (
        filter: GalleryFilterKey,
        payload: Omit<GalleryCacheEntry, 'updatedAt'>
    ) => void;
    getFilterCache: (filter: GalleryFilterKey) => GalleryCacheEntry | null;
}

export const useGalleryPickerStore = create<GalleryPickerState>((set, get) => ({
    pickedAssets: null,
    cacheByFilter: {},
    setPickedAssets: (assets) => set({ pickedAssets: assets }),
    clearPickedAssets: () => set({ pickedAssets: null }),
    setFilterCache: (filter, payload) =>
        set((state) => ({
            cacheByFilter: {
                ...state.cacheByFilter,
                [filter]: {
                    ...payload,
                    updatedAt: Date.now(),
                },
            },
        })),
    getFilterCache: (filter) => {
        const entry = get().cacheByFilter[filter];
        if (!entry) return null;
        return entry;
    },
}));
