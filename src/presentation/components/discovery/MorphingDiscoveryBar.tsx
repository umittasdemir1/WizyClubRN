import React, { useRef, useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { EXPAND_BTN_WIDTH, ICON_BTN_WIDTH } from "./constants";
import MorphedTabView from "./MorphedTabView";
import MorphBlurView from "./MorphBlurView";

const useExpandableWidth = (isActive: boolean) => {
    return useAnimatedStyle(() => ({
        width: withSpring(isActive ? EXPAND_BTN_WIDTH : ICON_BTN_WIDTH, {
            damping: 90,
        }),
    }));
};

export default function MorphingDiscoveryBar() {
    const [mode, setMode] = useState<"search" | "tabs">("tabs");
    const inputRef = useRef<TextInput>(null);

    const searchAnim = useExpandableWidth(mode === "search");
    const tabsAnim = useExpandableWidth(mode === "tabs");

    const onSearchPress = () => {
        setMode("search");
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const onCancelPress = () => {
        setMode("tabs");
        inputRef.current?.blur();
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <View style={styles.headerContainer}>

                {/* SEARCH CONTAINER */}
                <Animated.View style={[styles.cardContainer, searchAnim]}>
                    <MorphBlurView style={styles.searchContainer} isVisible={mode === "search"}>
                        <Pressable style={styles.searchButton} onPress={onSearchPress}>
                            <Search color={mode === "search" ? "black" : "white"} size={22} />
                            {/* Note: Icon color changes based on background? 
                  Tabs are light/blur. Search is light/blur.
                  Image shows dark text on light background.
                  "white" icon when collapsed? 
                  When collapsed (search icon mode), background is blur?
                  If background is black (app theme), icon should be white.
                  Inside MorphBlurView (which is light tint), icon should be black.
                  Wait, MorphBlurView tint="light". So contents should be dark.
              */}
                        </Pressable>

                        <TextInput
                            placeholder="Search"
                            placeholderTextColor="gray"
                            style={styles.textInput}
                            ref={inputRef}
                        />
                    </MorphBlurView>

                    {/* Collapsed Search Icon State (When mode == tabs) 
              When mode is tabs, search container is small (ICON_BTN_WIDTH).
              MorphBlurView is NOT visible (opacity 0).
              So we need a visible icon when collapsed.
          */}
                    {mode === "tabs" && (
                        <Pressable style={[styles.searchButton, StyleSheet.absoluteFill]} onPress={onSearchPress}>
                            <View style={styles.iconCircle}>
                                <Search color="white" size={20} />
                            </View>
                        </Pressable>
                    )}
                </Animated.View>

                {/* TABS + CLOSE BUTTON */}
                <Animated.View style={[styles.cardContainer, { justifyContent: "flex-end" }, tabsAnim]}>

                    <MorphBlurView style={styles.tabsInnerContainer} isVisible={mode === "tabs"}>
                        <MorphedTabView />
                    </MorphBlurView>

                    <MorphBlurView style={styles.closeButtonWrapper} isVisible={mode === "search"}>
                        <Pressable style={styles.cancelButton} onPress={onCancelPress}>
                            <X color="black" size={28} />
                        </Pressable>
                    </MorphBlurView>

                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 10,
        backgroundColor: 'transparent' // Was 'black', causing strip in light mode
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16, // Added padding
        gap: 12,
    },
    cardContainer: {
        height: 50,
        borderRadius: 40,
        overflow: "hidden",
        // Background when collapsed/hidden?
        // User code didn't have background on cardContainer, handled by BlurView.
    },
    searchContainer: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.9)', // Fallback / Base
    },
    searchButton: {
        width: ICON_BTN_WIDTH,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 5,
        color: 'black',
    },
    tabsInnerContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        backgroundColor: 'rgba(255,255,255,0.9)', // Ensure white-ish background for tabs
    },
    closeButtonWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "flex-end",
        paddingRight: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    cancelButton: {
        width: ICON_BTN_WIDTH,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
    },
});
