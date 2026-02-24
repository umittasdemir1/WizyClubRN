import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { textShadowStyle } from '@/core/utils/shadow';
import {
    DEFAULT_SUBTITLE_STYLE,
    SUBTITLE_BORDER_RADIUS,
    SUBTITLE_MIN_HEIGHT,
    SUBTITLE_SIDE_MARGIN,
    SUBTITLE_TEXT_BASE_STYLE,
    getSubtitleWrapperStyle,
    resolveSubtitleStyle,
} from '@/core/utils/subtitleOverlay';
import { SubtitlePresentation, SubtitleSegment, SubtitleStyle } from '@/domain/entities/Subtitle';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SUBTITLE_BASE_BOTTOM_OFFSET = 120;
const SUBTITLE_BOTTOM_LIMIT = 60;

export const DraggableSubtitleOverlay = ({
    segments,
    presentation,
    textStyle,
    currentTimeMs,
    onDragStart,
    onDragEnd,
    onEditingChange,
    onTextEditingChange,
    onUpdateSubtitle,
    onPresentationChange,
}: {
    segments: SubtitleSegment[],
    presentation?: SubtitlePresentation | null,
    textStyle?: SubtitleStyle | null,
    currentTimeMs: number,
    onDragStart?: () => void,
    onDragEnd?: () => void,
    onEditingChange?: (isEditing: boolean) => void,
    onTextEditingChange?: (isTextEditing: boolean) => void,
    onUpdateSubtitle?: (index: number, newText: string) => void,
    onPresentationChange?: (value: SubtitlePresentation) => void,
}) => {
    const activeIndex = segments.findIndex(s => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs);
    const activeSegment = activeIndex !== -1 ? segments[activeIndex] : null;

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const boxWidth = useSharedValue(SCREEN_WIDTH - 40);
    const boxHeight = useSharedValue(60);
    const containerWidth = useSharedValue(SCREEN_WIDTH);
    const containerHeight = useSharedValue(SCREEN_WIDTH * (16 / 9));
    const isEditingSV = useSharedValue(false);
    const [isEditing, setIsEditing] = useState(false);
    const showGuideX = useSharedValue(false);
    const showGuideY = useSharedValue(false);
    const showBoundaryY = useSharedValue(false);
    const lastSnapX = useSharedValue(false);
    const lastSnapY = useSharedValue(false);
    const [showTextSelectAction, setShowTextSelectAction] = useState(false);
    const [isInlineTextEditing, setIsInlineTextEditing] = useState(false);
    const [editedText, setEditedText] = useState(activeSegment?.text || '');
    const hasAppliedInitialPresentation = useRef(false);
    const lastAppliedLayoutRef = useRef<{ cw: number; ch: number; w: number; h: number }>({
        cw: 0,
        ch: 0,
        w: 0,
        h: 0,
    });

    const resolvedSubtitleStyle = resolveSubtitleStyle(textStyle ?? DEFAULT_SUBTITLE_STYLE);
    useEffect(() => {
        if (!isInlineTextEditing) {
            setEditedText(activeSegment?.text || '');
        }
    }, [activeSegment?.text, isInlineTextEditing]);

    const commitInlineSubtitleEdit = () => {
        if (onUpdateSubtitle && activeIndex !== -1 && editedText !== activeSegment?.text) {
            onUpdateSubtitle(activeIndex, editedText);
        }
    };

    const SNAP_THRESHOLD = 8;
    const context = useSharedValue({ x: 0, y: 0, w: 0, h: 0 });

    const applyPresentationLayout = useCallback((cw: number, ch: number, measuredW: number, measuredH: number) => {
        if (!presentation) return;
        const targetLeft = cw * presentation.leftRatio;
        const targetTop = ch * presentation.topRatio;
        const rawX = targetLeft - ((cw - measuredW) / 2);
        const maxOffsetByWidth = Math.max(0, ((cw - measuredW) / 2) - SUBTITLE_SIDE_MARGIN);
        translateX.value = Math.max(-maxOffsetByWidth, Math.min(maxOffsetByWidth, rawX));
        const computedY = targetTop - (ch - SUBTITLE_BASE_BOTTOM_OFFSET - measuredH);
        translateY.value = Math.min(computedY, SUBTITLE_BOTTOM_LIMIT);
        lastAppliedLayoutRef.current = { cw, ch, w: measuredW, h: measuredH };
        hasAppliedInitialPresentation.current = true;
    }, [presentation, translateX, translateY]);

    const emitPresentation = useCallback(() => {
        if (!onPresentationChange) return;
        const cw = containerWidth.value;
        const ch = containerHeight.value;
        const w = boxWidth.value;
        const h = boxHeight.value;
        if (!cw || !ch || !w || !h) return;

        const left = ((cw - w) / 2) + translateX.value;
        const clampedY = Math.min(translateY.value, SUBTITLE_BOTTOM_LIMIT);
        const top = (ch - SUBTITLE_BASE_BOTTOM_OFFSET - h) + clampedY;
        const leftRatio = Math.max(0, Math.min(1, left / cw));
        const topRatio = Math.max(0, Math.min(1, top / ch));
        const widthRatio = Math.max(0.05, Math.min(1, w / cw));
        const heightRatio = Math.max(0.05, Math.min(1, h / ch));

        onPresentationChange({ leftRatio, topRatio, widthRatio, heightRatio });
    }, [onPresentationChange, boxHeight, boxWidth, containerHeight, containerWidth, translateX, translateY]);

    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            'worklet';
            if (isInlineTextEditing) {
                return;
            }

            if (isEditing) {
                runOnJS(setShowTextSelectAction)(true);
                runOnJS(setIsInlineTextEditing)(true);
                runOnJS(setEditedText)(activeSegment?.text || '');
            } else {
                const nextValue = !isEditingSV.value;
                isEditingSV.value = nextValue;
                runOnJS(setIsEditing)(nextValue);
                if (!nextValue) {
                    runOnJS(setShowTextSelectAction)(false);
                    runOnJS(setIsInlineTextEditing)(false);
                    if (onTextEditingChange) runOnJS(onTextEditingChange)(false);
                }
                if (onEditingChange) runOnJS(onEditingChange)(nextValue);
                if (nextValue) {
                    void runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                }
            }
        });

    const dragGesture = Gesture.Pan()
        .onStart(() => {
            'worklet';
            context.value = { x: translateX.value, y: translateY.value, w: boxWidth.value, h: boxHeight.value };
            if (onDragStart) runOnJS(onDragStart)();
        })
        .onUpdate((event) => {
            'worklet';
            const absoluteX = context.value.x + event.translationX;
            const absoluteY = context.value.y + event.translationY;
            const maxOffsetByWidth = Math.max(
                0,
                ((containerWidth.value - boxWidth.value) / 2) - SUBTITLE_SIDE_MARGIN
            );
            const clampedX = Math.max(-maxOffsetByWidth, Math.min(maxOffsetByWidth, absoluteX));

            if (Math.abs(absoluteX) < SNAP_THRESHOLD) {
                translateX.value = 0;
                showGuideX.value = true;
                if (!lastSnapX.value) {
                    runOnJS(Haptics.selectionAsync)();
                    lastSnapX.value = true;
                }
            } else {
                translateX.value = clampedX;
                showGuideX.value = false;
                lastSnapX.value = false;
            }

            const initialCenterYFromTop = containerHeight.value - SUBTITLE_BASE_BOTTOM_OFFSET - boxHeight.value / 2;
            const targetCenterOffset = (containerHeight.value / 2) - initialCenterYFromTop;

            const isAtBottomLimit = absoluteY >= SUBTITLE_BOTTOM_LIMIT;
            showBoundaryY.value = isAtBottomLimit;
            const clampedY = Math.min(absoluteY, SUBTITLE_BOTTOM_LIMIT);

            if (Math.abs(clampedY - targetCenterOffset) < SNAP_THRESHOLD) {
                translateY.value = targetCenterOffset;
                showGuideY.value = true;
                if (!lastSnapY.value) {
                    runOnJS(Haptics.selectionAsync)();
                    lastSnapY.value = true;
                }
            } else {
                translateY.value = clampedY;
                showGuideY.value = false;
                lastSnapY.value = false;
            }
        })
        .onEnd(() => {
            'worklet';
            showGuideX.value = false;
            showGuideY.value = false;
            showBoundaryY.value = false;
            runOnJS(emitPresentation)();
            if (onDragEnd) runOnJS(onDragEnd)();
        });

    const screenTapGesture = Gesture.Tap()
        .onEnd(() => {
            'worklet';
            if (isEditingSV.value) {
                if (isInlineTextEditing) {
                    runOnJS(commitInlineSubtitleEdit)();
                    runOnJS(setIsInlineTextEditing)(false);
                } else {
                    isEditingSV.value = false;
                    runOnJS(setIsEditing)(false);
                    runOnJS(setShowTextSelectAction)(false);
                    if (onEditingChange) runOnJS(onEditingChange)(false);
                    if (onTextEditingChange) runOnJS(onTextEditingChange)(false);
                }
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value }
        ],
    }));

    const guideXStyle = useAnimatedStyle(() => ({
        opacity: withTiming(showGuideX.value ? 1 : 0, { duration: 100 }),
    }));

    const guideYStyle = useAnimatedStyle(() => ({
        opacity: withTiming(showGuideY.value ? 1 : 0, { duration: 100 }),
    }));

    const boundaryYStyle = useAnimatedStyle(() => ({
        opacity: withTiming(showBoundaryY.value ? 1 : 0, { duration: 100 }),
    }));

    if (!activeSegment) return null;

    return (
        <View
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
            onLayout={(e) => {
                const cw = e.nativeEvent.layout.width;
                const ch = e.nativeEvent.layout.height;
                containerWidth.value = cw;
                containerHeight.value = ch;

                const hasContainerLayoutChanged =
                    Math.abs(cw - lastAppliedLayoutRef.current.cw) > 0.5 ||
                    Math.abs(ch - lastAppliedLayoutRef.current.ch) > 0.5;
                const hasSubtitleSizeChanged =
                    Math.abs(boxWidth.value - lastAppliedLayoutRef.current.w) > 0.5 ||
                    Math.abs(boxHeight.value - lastAppliedLayoutRef.current.h) > 0.5;

                if (
                    presentation &&
                    boxWidth.value > 0 &&
                    boxHeight.value > 0 &&
                    (
                        !hasAppliedInitialPresentation.current ||
                        hasContainerLayoutChanged ||
                        hasSubtitleSizeChanged
                    )
                ) {
                    applyPresentationLayout(cw, ch, boxWidth.value, boxHeight.value);
                }
            }}
        >
            <Animated.View
                style={[
                    styles.guideLineVertical,
                    { left: '50%', transform: [{ translateX: -0.5 }] },
                    guideXStyle
                ]}
            />
            <Animated.View
                style={[
                    styles.guideLineHorizontal,
                    { top: '50%', transform: [{ translateY: -0.5 }] },
                    guideYStyle
                ]}
            />
            <Animated.View
                style={[
                    styles.guideLineBoundaryHorizontal,
                    { bottom: SUBTITLE_BOTTOM_LIMIT },
                    boundaryYStyle
                ]}
            />

            <GestureDetector gesture={screenTapGesture}>
                <View
                    style={StyleSheet.absoluteFill}
                    pointerEvents={isEditing ? 'auto' : 'none'}
                />
            </GestureDetector>

            <GestureDetector gesture={Gesture.Race(dragGesture, tapGesture)}>
                <Animated.View
                    style={[
                        styles.subtitleOverlay,
                        animatedStyle
                    ]}
                    collapsable={false}
                    onLayout={(event) => {
                        const measuredW = Math.max(1, event.nativeEvent.layout.width);
                        const measuredH = Math.max(1, event.nativeEvent.layout.height);
                        boxWidth.value = measuredW;
                        boxHeight.value = measuredH;

                        const cw = containerWidth.value || SCREEN_WIDTH;
                        const ch = containerHeight.value || (SCREEN_WIDTH * (16 / 9));
                        const hasContainerLayoutChanged =
                            Math.abs(cw - lastAppliedLayoutRef.current.cw) > 0.5 ||
                            Math.abs(ch - lastAppliedLayoutRef.current.ch) > 0.5;
                        const hasSubtitleSizeChanged =
                            Math.abs(measuredW - lastAppliedLayoutRef.current.w) > 0.5 ||
                            Math.abs(measuredH - lastAppliedLayoutRef.current.h) > 0.5;

                        if (
                            presentation &&
                            (
                                !hasAppliedInitialPresentation.current ||
                                hasContainerLayoutChanged ||
                                hasSubtitleSizeChanged
                            )
                        ) {
                            applyPresentationLayout(cw, ch, measuredW, measuredH);
                        }
                        if (!presentation) {
                            emitPresentation();
                        }
                    }}
                >
                    <View
                        style={[
                            styles.subtitleTextOverlayWrapper,
                            getSubtitleWrapperStyle(
                                resolvedSubtitleStyle.showOverlay,
                                resolvedSubtitleStyle.overlayVariant
                            ),
                        ]}
                    >
                        {isInlineTextEditing ? (
                            <TextInput
                                style={[
                                    styles.subtitleText,
                                    {
                                        fontSize: resolvedSubtitleStyle.fontSize,
                                        lineHeight: resolvedSubtitleStyle.lineHeight,
                                        textAlign: resolvedSubtitleStyle.textAlign,
                                        color: resolvedSubtitleStyle.textColor,
                                        fontFamily: resolvedSubtitleStyle.fontFamily,
                                        fontWeight: resolvedSubtitleStyle.fontWeight,
                                    }
                                ]}
                                value={editedText}
                                onChangeText={setEditedText}
                                autoFocus
                                multiline
                                onBlur={() => {
                                    commitInlineSubtitleEdit();
                                    setIsInlineTextEditing(false);
                                }}
                            />
                        ) : (
                            <Text
                                pointerEvents="none"
                                style={[
                                    styles.subtitleText,
                                    {
                                        fontSize: resolvedSubtitleStyle.fontSize,
                                        lineHeight: resolvedSubtitleStyle.lineHeight,
                                        textAlign: resolvedSubtitleStyle.textAlign,
                                        color: resolvedSubtitleStyle.textColor,
                                        fontFamily: resolvedSubtitleStyle.fontFamily,
                                        fontWeight: resolvedSubtitleStyle.fontWeight,
                                    }
                                ]}
                            >
                                {activeSegment.text}
                            </Text>
                        )}
                    </View>

                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleOverlay: {
        position: 'absolute',
        bottom: SUBTITLE_BASE_BOTTOM_OFFSET,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: SUBTITLE_MIN_HEIGHT,
        zIndex: 1000,
        ...textShadowStyle('#000000', { width: 0, height: 1 }, 2),
    },
    subtitleTextOverlayWrapper: {
        borderRadius: SUBTITLE_BORDER_RADIUS,
        alignSelf: 'stretch',
        position: 'relative',
        maxWidth: SCREEN_WIDTH - (SUBTITLE_SIDE_MARGIN * 2),
    },
    subtitleText: {
        ...SUBTITLE_TEXT_BASE_STYLE,
    },
    guideLineVertical: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#FFFFFF',
        zIndex: 500,
    },
    guideLineHorizontal: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#FFFFFF',
        zIndex: 500,
    },
    guideLineBoundaryHorizontal: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#FFFFFF',
        zIndex: 500,
    },
});
