import React, { useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

interface DoubleTapLikeProps {
    children: React.ReactNode;
    onDoubleTap: () => void;
}

export function DoubleTapLike({ children, onDoubleTap }: DoubleTapLikeProps) {
    const doubleTapRef = useRef(null);
    const scale = useRef(new Animated.Value(0)).current;

    const handleDoubleTap = ({ nativeEvent }: any) => {
        if (nativeEvent.state === State.ACTIVE) {
            // Trigger like
            onDoubleTap();

            // Animate heart
            scale.setValue(0);
            Animated.spring(scale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }).start(() => {
                // Fade out after showing
                Animated.timing(scale, {
                    toValue: 0,
                    duration: 300,
                    delay: 200,
                    useNativeDriver: true,
                }).start();
            });
        }
    };

    return (
        <View style={styles.container}>
            <TapGestureHandler
                ref={doubleTapRef}
                onHandlerStateChange={handleDoubleTap}
                numberOfTaps={2}
                maxDurationMs={300}
            >
                <Animated.View style={styles.container}>
                    {children}

                    {/* Heart animation */}
                    <Animated.View
                        style={[
                            styles.heart,
                            {
                                opacity: scale,
                                transform: [{ scale }],
                            },
                        ]}
                        pointerEvents="none"
                    >
                        <View style={styles.heartIcon}>
                            <View style={styles.heartShape} />
                        </View>
                    </Animated.View>
                </Animated.View>
            </TapGestureHandler>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heart: {
        position: 'absolute',
        alignSelf: 'center',
        top: '40%',
        zIndex: 100,
    },
    heartIcon: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartShape: {
        width: 80,
        height: 80,
        backgroundColor: '#FF3B30',
        borderRadius: 40,
        transform: [{ rotate: '45deg' }],
    },
});
