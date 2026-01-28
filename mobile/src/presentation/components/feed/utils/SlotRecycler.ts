/**
 * SlotRecycler - TikTok-style Video Player Recycling Logic
 *
 * This utility handles the logic of assigning video indices to available
 * player slots in a recycling pool (usually 3 slots: current, next, previous).
 */

import { Video as VideoEntity } from '../../../../domain/entities/Video';

/**
 * Interface representing a player slot in the pool.
 * Note: This should match the one in VideoPlayerPool.tsx
 */
export interface PlayerSlot {
    index: number;
    videoId: string;
    source: string;
    thumbnailUrl?: string;
    position: number;
    isLoaded: boolean;
    isReadyForDisplay: boolean;
    resizeMode: 'cover' | 'contain';
    retryCount: number;
    hasError: boolean;
    isCarousel: boolean;
    retryNonce: number;
}

export interface RecycleResult {
    /** Map of slot index -> video index to be loaded */
    targetIndices: (number | null)[];
    /** The index of the slot that will hold the active video */
    activeSlotIndex: number;
}

export class SlotRecycler {
    /**
     * Calculates which video indices should be assigned to which pool slots.
     *
     * @param activeIndex - Current scrolling index in the FlashList
     * @param activeVideoIndex - The actual index of the active video in the videos array
     * @param playableIndices - Array of indices that are playable (not carousels)
     * @param priorSlots - Current state of the slots before recycling
     * @param poolSize - Size of the player pool (usually 3)
     * @returns Target indices for each slot and the active slot index
     */
    static calculateTargetIndices(
        activeIndex: number,
        activeVideoIndex: number | null,
        playableIndices: number[],
        priorSlots: PlayerSlot[],
        poolSize: number
    ): RecycleResult {
        // 1. Determine current/next/prev candidates
        const currentIdx = activeVideoIndex;
        const nextIdx = playableIndices.find((idx) => idx > activeIndex) ?? null;
        const prevIdx = [...playableIndices].reverse().find((idx) => idx < activeIndex) ?? null;

        // 2. Resolve where the active video should go
        const resolveActiveSlotIndex = (): number => {
            if (currentIdx == null) return -1;

            // Prefer keeping the video in its existing slot
            const existingSlot = priorSlots.findIndex((slot) => slot.index === currentIdx);
            if (existingSlot >= 0) return existingSlot;

            // Otherwise, take an empty slot or fallback to slot 0
            const emptySlot = priorSlots.findIndex((slot) => slot.index < 0);
            if (emptySlot >= 0) return emptySlot;

            return 0;
        };

        const activeSlotIndex = resolveActiveSlotIndex();
        const targetIndices: (number | null)[] = new Array(poolSize).fill(null);
        const usedIndices = new Set<number>();

        // 3. Assign active video to its slot
        if (activeSlotIndex >= 0 && currentIdx != null) {
            targetIndices[activeSlotIndex] = currentIdx;
            usedIndices.add(currentIdx);
        }

        // 4. Fill remaining slots with next/prev indices while preserving existing assignments
        const remainingTargets = [nextIdx, prevIdx].filter((idx, pos, arr) =>
            idx != null && idx !== currentIdx && arr.indexOf(idx) === pos
        ) as number[];

        // Phase 1: Keep already assigned next/prev in their current slots
        for (let slotIndex = 0; slotIndex < poolSize; slotIndex++) {
            if (slotIndex === activeSlotIndex) continue;

            const existingIdx = priorSlots[slotIndex]?.index;
            if (existingIdx != null && remainingTargets.includes(existingIdx) && !usedIndices.has(existingIdx)) {
                targetIndices[slotIndex] = existingIdx;
                usedIndices.add(existingIdx);
            }
        }

        // Phase 2: Fill empty slots with remaining targets
        for (let slotIndex = 0; slotIndex < poolSize; slotIndex++) {
            if (targetIndices[slotIndex] != null) continue;

            const nextTarget = remainingTargets.find((idx) => !usedIndices.has(idx));
            if (nextTarget != null) {
                targetIndices[slotIndex] = nextTarget;
                usedIndices.add(nextTarget);
            }
        }

        return { targetIndices, activeSlotIndex };
    }
}
