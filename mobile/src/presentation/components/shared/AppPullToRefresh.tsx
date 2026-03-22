import React from 'react';
import { Animated, Platform, RefreshControl } from 'react-native';
import { ThinSpinner } from './ThinSpinner';

const DEFAULT_PULL_TRANSLATE_Y = 20;
export const APP_PULL_TO_REFRESH_SPINNER_SIZE = 36;
export const APP_PULL_TO_REFRESH_SPINNER_BORDER_WIDTH = 1.6;

interface AppRefreshControlProps {
    refreshing: boolean;
    onRefresh: () => void;
    spinnerColor: string;
    backgroundColor?: string;
    progressViewOffset?: number;
    hideNativeSpinner?: boolean;
}

interface AppPullToRefreshOverlayProps {
    scrollY: Animated.Value;
    topOffset: number;
    spinnerColor: string;
    spinnerSize?: number;
    spinnerBorderWidth?: number;
    pullTranslateY?: number;
}

export function AppRefreshControl({
    refreshing,
    onRefresh,
    spinnerColor,
    backgroundColor,
    progressViewOffset = 0,
    hideNativeSpinner = false,
}: AppRefreshControlProps) {
    return (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={hideNativeSpinner ? 'transparent' : spinnerColor}
            colors={[spinnerColor]}
            progressBackgroundColor={backgroundColor}
            progressViewOffset={progressViewOffset}
        />
    );
}

export function AppPullToRefreshOverlay({
    scrollY,
    topOffset,
    spinnerColor,
    spinnerSize = APP_PULL_TO_REFRESH_SPINNER_SIZE,
    spinnerBorderWidth = APP_PULL_TO_REFRESH_SPINNER_BORDER_WIDTH,
    pullTranslateY = DEFAULT_PULL_TRANSLATE_Y,
}: AppPullToRefreshOverlayProps) {
    if (Platform.OS !== 'ios') return null;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: topOffset,
                width: '100%',
                alignItems: 'center',
                zIndex: 1,
                opacity: scrollY.interpolate({
                    inputRange: [-60, -20, 0],
                    outputRange: [1, 0, 0],
                    extrapolate: 'clamp',
                }),
                transform: [{
                    translateY: scrollY.interpolate({
                        inputRange: [-100, 0],
                        outputRange: [pullTranslateY, 0],
                        extrapolate: 'clamp',
                    }),
                }],
            }}
            pointerEvents="none"
        >
            <ThinSpinner
                size={spinnerSize}
                borderWidth={spinnerBorderWidth}
                color={spinnerColor}
            />
        </Animated.View>
    );
}
