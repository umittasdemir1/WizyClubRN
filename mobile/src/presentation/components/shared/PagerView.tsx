import React, { forwardRef, useImperativeHandle } from 'react';
import { Platform, View } from 'react-native';
import PagerViewNative from 'react-native-pager-view';
import type { PagerViewProps } from 'react-native-pager-view';

type PagerViewRef = React.ElementRef<typeof PagerViewNative>;

const PagerView = forwardRef<PagerViewRef, PagerViewProps>(({ children, style, ...rest }, ref) => {
    if (Platform.OS === 'web') {
        useImperativeHandle(ref, () => ({
            setPage: () => {},
            setPageWithoutAnimation: () => {},
        }) as unknown as PagerViewRef);

        return <View style={style}>{children}</View>;
    }

    return (
        <PagerViewNative
            {...rest}
            style={style}
            ref={ref}
        >
            {children}
        </PagerViewNative>
    );
});

PagerView.displayName = 'PagerView';

export default PagerView;
