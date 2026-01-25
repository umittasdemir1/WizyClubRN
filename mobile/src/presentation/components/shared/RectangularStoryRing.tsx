import React from 'react';
import { View, StyleSheet } from 'react-native';
import { shadowStyle } from '@/core/utils/shadow';

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
  const cornerRadius = 10;
  const ringColor = viewed ? '#9A9A9A' : '#00C6FF';
  const innerRadius = Math.max(0, cornerRadius - thickness - gap);

  return (
    <View style={[styles.container, { width, height }]}>
      <View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            borderWidth: thickness,
            borderRadius: cornerRadius,
          },
          !viewed && styles.ringGlow,
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              margin: thickness + gap,
              borderRadius: innerRadius,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  ringGlow: {
    ...shadowStyle({ color: '#00C6FF', offset: { width: 0, height: 0 }, opacity: 0.4, radius: 6, elevation: 4 }),
  },
  inner: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0E0F12',
  },
});
