import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  RoundedRect,
  SweepGradient,
  BlurMask,
  vec,
  Group,
  LinearGradient,
  RadialGradient,
} from '@shopify/react-native-skia';

interface RectangularStoryRingProps {
  width: number;
  height: number;
  thickness?: number;
  gap?: number;
  viewed?: boolean;
  children?: React.ReactNode;
}

export const RectangularStoryRing: React.FC<RectangularStoryRingProps> = ({
  width,
  height,
  thickness = 3,
  gap = 3,
  viewed = false,
  children,
}) => {
  const canvasPadding = 20;
  const canvasWidth = width + canvasPadding;
  const canvasHeight = height + canvasPadding;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Ring dimensions
  const ringWidth = width - thickness;
  const ringHeight = height - thickness;
  const ringX = (canvasWidth - ringWidth) / 2;
  const ringY = (canvasHeight - ringHeight) / 2;
  const cornerRadius = 10;

  // Colors for the gradient
  const gradientColors = useMemo(() =>
    viewed
      ? ['#4A4A4A', '#9A9A9A', '#4A4A4A']
      : ['#00C6FF', '#9D50BB', '#FE4A49', '#00C6FF']
  , [viewed]);

  const outerGlowColor = 'rgba(0, 198, 255, 0.3)';

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{
          position: 'absolute',
          width: canvasWidth,
          height: canvasHeight,
          top: -canvasPadding / 2,
          left: -canvasPadding / 2
      }}>
        {/* Outer Glow (only if not viewed) */}
        {!viewed && (
          <RoundedRect
            x={ringX - 2}
            y={ringY - 2}
            width={ringWidth + 4}
            height={ringHeight + 4}
            r={cornerRadius}
            color={outerGlowColor}
            style="stroke"
            strokeWidth={thickness + 4}
          >
            <BlurMask blur={8} style="normal" />
          </RoundedRect>
        )}

        {/* Main Ring */}
        <Group>
          <RoundedRect
            x={ringX}
            y={ringY}
            width={ringWidth}
            height={ringHeight}
            r={cornerRadius}
            style="stroke"
            strokeWidth={thickness}
          >
            <SweepGradient
              c={vec(centerX, centerY)}
              colors={gradientColors}
            />
          </RoundedRect>

          {/* Glass Effects / Highlights */}
          {!viewed && (
            <>
              {/* Inner Inset White */}
              <RoundedRect
                x={ringX + thickness / 2}
                y={ringY + thickness / 2}
                width={ringWidth - thickness}
                height={ringHeight - thickness}
                r={cornerRadius - 1}
                style="stroke"
                strokeWidth={1}
                color="rgba(255,255,255,0.15)"
              />

              {/* Radial Highlight */}
              <RoundedRect
                x={ringX}
                y={ringY}
                width={ringWidth}
                height={ringHeight}
                r={cornerRadius}
                style="stroke"
                strokeWidth={thickness}
              >
                <RadialGradient
                  c={vec(centerX - ringWidth * 0.3, centerY - ringHeight * 0.3)}
                  r={Math.max(ringWidth, ringHeight)}
                  colors={['rgba(255,255,255,0.5)', 'transparent']}
                />
              </RoundedRect>

              {/* Linear Reflection */}
              <RoundedRect
                x={ringX}
                y={ringY}
                width={ringWidth}
                height={ringHeight}
                r={cornerRadius}
                style="stroke"
                strokeWidth={thickness}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(canvasWidth, canvasHeight)}
                  colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                  positions={[0.3, 0.5, 0.7]}
                />
              </RoundedRect>
            </>
          )}
        </Group>
      </Canvas>

      {/* Inner Content (Thumbnail) */}
      <View
        style={{
          width: width - (thickness * 2) - (gap * 2),
          height: height - (thickness * 2) - (gap * 2),
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#0E0F12',
          zIndex: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
};
