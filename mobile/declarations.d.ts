declare module "*.svg" {
    import React from "react";
    import { SvgProps } from "react-native-svg";
    const content: React.FC<SvgProps>;
    export default content;
}

// FlashList module declaration
declare module '@shopify/flash-list' {
    import { ComponentType } from 'react';
    import { FlatListProps } from 'react-native';

    export interface FlashListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
        estimatedItemSize: number;
        overrideItemLayout?: (layout: { span?: number; size?: number }, item: T, index: number, maxColumns: number, extraData?: any) => void;
    }

    export const FlashList: ComponentType<FlashListProps<any>>;
    export default FlashList;
}
