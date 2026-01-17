import React from 'react';
import { View, StyleSheet } from 'react-native';

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
  const ringColor = viewed ? '#9A9A9A' : '#00C6FF';
  const innerSize = Math.max(0, size - (thickness * 2) - (gap * 2));
  const innerRadius = Math.max(0, innerSize / 2);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: ringColor,
          },
          !viewed && styles.ringGlow,
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              margin: thickness + gap,
              width: innerSize,
              height: innerSize,
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGlow: {
    shadowColor: '#00C6FF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  inner: {
    overflow: 'hidden',
    backgroundColor: '#0E0F12',
  },
});
