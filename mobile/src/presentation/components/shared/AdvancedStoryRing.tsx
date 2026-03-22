import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface AdvancedStoryRingProps {
  size: number;
  thickness?: number;
  gap?: number;
  viewed?: boolean;
  children?: React.ReactNode;
}

type RingSegment = {
  id: number;
  color: string;
  path: string;
};

const ACTIVE_RING_STOPS = [
  '#FF416C',
  '#FF9068',
  '#FFD93D',
  '#6BCF7F',
  '#4D96FF',
  '#FF416C',
];

const VIEWED_RING_COLOR = '#9A9A9A';
const START_OFFSET = -Math.PI / 2;
const MIN_SEGMENTS = 120;
const MAX_SEGMENTS = 240;

const segmentCache = new Map<string, RingSegment[]>();

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const interpolateStopColor = (stops: string[], t: number) => {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.floor(scaled);
  const localT = scaled - index;
  const start = hexToRgb(stops[index]);
  const end = hexToRgb(stops[Math.min(index + 1, stops.length - 1)]);

  return rgbToHex(
    lerp(start.r, end.r, localT),
    lerp(start.g, end.g, localT),
    lerp(start.b, end.b, localT)
  );
};

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const getSegmentCount = (size: number) => {
  const adaptiveCount = Math.round(size * 2.5);
  return Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, adaptiveCount));
};

const buildSegments = (size: number, thickness: number): RingSegment[] => {
  const segmentCount = getSegmentCount(size);
  const cacheKey = `${size}:${thickness}:${segmentCount}`;
  const cached = segmentCache.get(cacheKey);
  if (cached) return cached;

  const center = size / 2;
  const radius = Math.max(0, center - thickness / 2);
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const startAngle = START_OFFSET + (index / segmentCount) * Math.PI * 2;
    const endAngle = START_OFFSET + ((index + 1) / segmentCount) * Math.PI * 2;
    const t = index / segmentCount;

    return {
      id: index,
      path: describeArc(center, center, radius, startAngle, endAngle),
      color: interpolateStopColor(ACTIVE_RING_STOPS, t),
    };
  });

  segmentCache.set(cacheKey, segments);
  return segments;
};

export const AdvancedStoryRing: React.FC<AdvancedStoryRingProps> = memo(function AdvancedStoryRing({
  size,
  thickness = 1.5,
  gap = 1.5,
  viewed = false,
  children,
}: AdvancedStoryRingProps) {
  const center = size / 2;
  const radius = Math.max(0, center - thickness / 2);
  const innerSize = Math.max(0, size - (thickness * 2) - (gap * 2));
  const innerRadius = Math.max(0, innerSize / 2);
  const segments = useMemo(() => buildSegments(size, thickness), [size, thickness]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {viewed ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={VIEWED_RING_COLOR}
            strokeWidth={thickness}
            fill="none"
          />
        ) : (
          <>
            {segments.map((segment) => (
              <Path
                key={`ring-${segment.id}`}
                d={segment.path}
                stroke={segment.color}
                strokeWidth={thickness}
                fill="none"
                strokeLinecap="square"
              />
            ))}
          </>
        )}
      </Svg>

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
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    overflow: 'hidden',
    backgroundColor: '#0E0F12',
  },
});
