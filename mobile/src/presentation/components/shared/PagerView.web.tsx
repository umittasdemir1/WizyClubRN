import React from 'react';
import { View } from 'react-native';
import type { PagerViewProps } from 'react-native-pager-view';

const PagerView = ({ children, style }: PagerViewProps) => {
    return <View style={style}>{children}</View>;
};

export default PagerView;
