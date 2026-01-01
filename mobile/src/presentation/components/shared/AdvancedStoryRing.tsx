import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  SweepGradient,
  BlurMask,
  vec,
  Group,
  LinearGradient,
  RadialGradient,
} from '@shopify/react-native-skia';

interface AdvancedStoryRingProps {
  size: number;
  thickness?: number;
  gap?: number;
  viewed?: boolean;
  children?: React.ReactNode;
}

export const AdvancedStoryRing: React.FC<AdvancedStoryRingProps> = ({
  size,
  thickness = 3,
  gap = 3,
  viewed = false,
  children,
}) => {
  const canvasPadding = 20; // Extra space for glow
  const canvasSize = size + canvasPadding;
  const center = canvasSize / 2;
  
  // Calculate radius so the outer edge of the main ring touches 'size'
  // Ring is drawn with stroke centered on path.
  // Outer edge = pathRadius + strokeWidth/2
  // size/2 = pathRadius + thickness/2
  // pathRadius = (size - thickness) / 2
  const ringRadius = (size - thickness) / 2;

  // Colors for the conic gradient - "Aurora Glass"
  // #00C6FF (Tech Blue) -> #9D50BB (Deep Purple) -> #FE4A49 (Coral Red) -> #00C6FF
  const gradientColors = useMemo(() => 
    viewed 
      ? ['#4A4A4A', '#9A9A9A', '#4A4A4A'] // Metallic Silver for viewed
      : ['#00C6FF', '#9D50BB', '#FE4A49', '#00C6FF']
  , [viewed]);

  const outerGlowColor = 'rgba(0, 198, 255, 0.3)'; // Adjusted glow to match primary blue

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ 
          position: 'absolute', 
          width: canvasSize, 
          height: canvasSize,
          top: -canvasPadding / 2,
          left: -canvasPadding / 2
      }}>
        {/* Outer Glow (only if not viewed) */}
        {!viewed && (
          <Circle 
            cx={center} 
            cy={center} 
            r={ringRadius} 
            color={outerGlowColor}
            style="stroke" 
            strokeWidth={thickness + 4}
          >
            <BlurMask blur={8} style="normal" />
          </Circle>
        )}

        {/* Main Ring */}
        <Group>
          <Circle cx={center} cy={center} r={ringRadius} style="stroke" strokeWidth={thickness}>
             <SweepGradient
                c={vec(center, center)}
                colors={gradientColors}
              />
          </Circle>

           {/* Glass Effects / Highlights */}
           {!viewed && (
             <>
                {/* Inner Inset White 0.15 */}
                <Circle 
                    cx={center} 
                    cy={center} 
                    r={ringRadius - thickness / 2 + 1} 
                    style="stroke" 
                    strokeWidth={1} 
                    color="rgba(255,255,255,0.15)" 
                />
                
                {/* Radial Highlight */}
                <Circle cx={center} cy={center} r={ringRadius} style="stroke" strokeWidth={thickness}>
                    <RadialGradient
                      c={vec(center - ringRadius * 0.5, center - ringRadius * 0.5)}
                      r={ringRadius * 2}
                      colors={['rgba(255,255,255,0.5)', 'transparent']}
                    />
                </Circle>

                 {/* Linear Reflection */}
                 <Circle cx={center} cy={center} r={ringRadius} style="stroke" strokeWidth={thickness}>
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(canvasSize, canvasSize)}
                      colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                      positions={[0.3, 0.5, 0.7]}
                    />
                 </Circle>
             </>
           )}
        </Group>
      </Canvas>

      {/* Inner Content (Avatar) */}
      <View
        style={{
          width: size - (thickness * 2) - (gap * 2),
          height: size - (thickness * 2) - (gap * 2),
          borderRadius: (size - (thickness * 2) - (gap * 2)) / 2,
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
