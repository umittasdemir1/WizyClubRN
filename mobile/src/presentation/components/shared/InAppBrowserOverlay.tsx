import { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Dimensions,
    PanResponder,
    Animated as RNAnimated,
    Easing,
    BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LIGHT_COLORS } from '../../../core/constants';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function InAppBrowserOverlay() {
    const isVisible = useInAppBrowserStore((state) => state.isVisible);
    const currentUrl = useInAppBrowserStore((state) => state.currentUrl);
    const close = useInAppBrowserStore((state) => state.close);
    const addHistoryEntry = useInAppBrowserStore((state) => state.addHistoryEntry);

    const [isMounted, setIsMounted] = useState(false);
    const translateY = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(
        translateY.interpolate({
            inputRange: [0, SCREEN_HEIGHT],
            outputRange: [0.4, 0],
            extrapolate: 'clamp',
        })
    ).current;
    const isClosingRef = useRef(false);

    const animateOpen = useCallback(() => {
        isClosingRef.current = false;
        RNAnimated.timing(translateY, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [translateY]);

    const animateClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        RNAnimated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(() => {
            setIsMounted(false);
            isClosingRef.current = false;
        });
    }, [translateY]);

    useEffect(() => {
        if (isVisible) {
            setIsMounted(true);
            animateOpen();
        } else if (isMounted) {
            animateClose();
        }
    }, [isVisible, isMounted, animateOpen, animateClose]);

    useEffect(() => {
        if (!isVisible) return;
        const handleBackPress = () => {
            close();
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [isVisible, close]);

    const handleWebViewNavigation = useCallback(
        (navState: { url?: string; title?: string }) => {
            const url = navState.url;
            if (!url || url === 'about:blank') return;
            addHistoryEntry({
                url,
                title: navState.title,
                timestamp: Date.now(),
            });
        },
        [addHistoryEntry]
    );

    const webSheetPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
            onPanResponderMove: (_, gesture) => {
                if (isClosingRef.current) return;
                if (gesture.dy > 0) {
                    translateY.setValue(gesture.dy);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (isClosingRef.current) return;
                if (gesture.dy > 120) {
                    close();
                    return;
                }
                RNAnimated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    if (!isMounted || !currentUrl) {
        return null;
    }

    return (
        <View style={styles.webSheetOverlay}>
            <View style={styles.webSheetBackdrop}>
                <RNAnimated.View
                    pointerEvents="none"
                    style={[styles.webSheetBackdropOverlay, { opacity: backdropOpacity }]}
                />
                <Pressable style={styles.webSheetBackdropPressable} onPress={close} />
                <RNAnimated.View
                    style={[
                        styles.webSheetContainer,
                        { transform: [{ translateY }] },
                    ]}
                >
                    <View style={styles.webSheetDragArea} {...webSheetPanResponder.panHandlers}>
                        <View style={styles.webSheetHandle} />
                        <View style={styles.webSheetHeader}>
                            <View style={styles.webSheetClose} />
                        </View>
                    </View>
                    <WebView
                        source={{ uri: currentUrl }}
                        startInLoadingState={true}
                        originWhitelist={['*']}
                        onNavigationStateChange={handleWebViewNavigation}
                        style={styles.webSheetWebView}
                    />
                </RNAnimated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    webSheetBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    webSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 200,
    },
    webSheetBackdropOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    webSheetBackdropPressable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: '85%',
    },
    webSheetContainer: {
        height: '85%',
        backgroundColor: LIGHT_COLORS.background,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'hidden',
    },
    webSheetDragArea: {
        backgroundColor: LIGHT_COLORS.background,
    },
    webSheetHandle: {
        alignSelf: 'center',
        width: 32,
        height: 3,
        borderRadius: 2,
        backgroundColor: LIGHT_COLORS.black,
        marginTop: 6,
        marginBottom: 4,
    },
    webSheetHeader: {
        height: 14,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_COLORS.border,
        backgroundColor: LIGHT_COLORS.background,
    },
    webSheetClose: {
        width: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    webSheetWebView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
