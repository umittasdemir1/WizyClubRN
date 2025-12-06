import '@shopify/flash-list';

declare module '@shopify/flash-list' {
    // Augment the existing FlashListProps interface to include the missing property
    export interface FlashListProps<T> {
        /**
         * Estimated size of the list item in pixels.
         * This is required for optimal performance and to avoid blank spaces during scrolling.
         */
        estimatedItemSize: number;
    }
}
