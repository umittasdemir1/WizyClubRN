import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { CameraType } from 'expo-camera';
import GoBackIcon from '../../../../../assets/icons/goback.svg';
import GoFrontIcon from '../../../../../assets/icons/gofront.svg';

interface CameraFlipButtonProps {
    facing: CameraType;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

export const CameraFlipButton = ({ facing, onPress, style }: CameraFlipButtonProps) => {
    const animation = useRef(new Animated.Value(facing === 'front' ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animation, {
            toValue: facing === 'front' ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [animation, facing]);

    const goBackOpacity = animation;
    const goFrontOpacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });
    const iconScale = animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0.92, 1],
    });
    const goBackRotate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['-90deg', '0deg'],
    });
    const goFrontRotate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '90deg'],
    });

    return (
        <Pressable onPress={onPress} style={[styles.button, style]}>
            <View style={styles.iconContainer}>
                <Animated.View
                    style={[
                        styles.iconLayer,
                        {
                            opacity: goFrontOpacity,
                            transform: [{ rotate: goFrontRotate }, { scale: iconScale }],
                        },
                    ]}
                >
                    <GoFrontIcon width={32} height={32} />
                </Animated.View>
                <Animated.View
                    style={[
                        styles.iconLayer,
                        {
                            opacity: goBackOpacity,
                            transform: [{ rotate: goBackRotate }, { scale: iconScale }],
                        },
                    ]}
                >
                    <GoBackIcon width={32} height={32} />
                </Animated.View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLayer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
