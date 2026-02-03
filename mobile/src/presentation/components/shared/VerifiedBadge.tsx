import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface VerifiedBadgeProps {
  size?: number;
  color?: string;
  checkColor?: string;
}

export function VerifiedBadge({ size = 20, color = '#3D91FF', checkColor = '#FFFFFF' }: VerifiedBadgeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960" fill="none">
      <Path
        d="m344-60-76-128-144-32+14-148-98-112+98-112-14-148+144-32+76-128+136+58+136-58+76+128+144+32-14+148+98+112-98+112+14+148-144+32-76+128-136-58-136+58Z"
        fill={color}
      />
      <Path
        d="M438-338 664-564 608-622 438-452 352-536 296-480 438-338Z"
        fill={checkColor}
      />
    </Svg>
  );
}
