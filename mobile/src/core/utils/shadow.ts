import { Platform } from 'react-native';

type ShadowOffset = { width: number; height: number };

interface ShadowOptions {
    color: string;
    offset: ShadowOffset;
    radius: number;
    opacity: number;
    elevation?: number;
}

const hexToRgba = (hex: string, opacity: number) => {
    let normalized = hex.replace('#', '').trim();
    if (normalized.length === 3) {
        normalized = normalized.split('').map((c) => c + c).join('');
    }
    if (normalized.length !== 6) {
        return hex;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const withOpacity = (color: string, opacity: number) => {
    if (color.startsWith('#')) {
        return hexToRgba(color, opacity);
    }
    if (color.startsWith('rgba(')) {
        return color;
    }
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    return color;
};

export const shadowStyle = ({ color, offset, radius, opacity, elevation }: ShadowOptions) => {
    if (Platform.OS === 'web') {
        return {
            boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${withOpacity(color, opacity)}`
        };
    }
    return {
        shadowColor: color,
        shadowOffset: offset,
        shadowOpacity: opacity,
        shadowRadius: radius,
        ...(typeof elevation === 'number' ? { elevation } : {}),
    };
};

export const textShadowStyle = (color: string, offset: ShadowOffset, radius: number) => {
    if (Platform.OS === 'web') {
        return {
            textShadow: `${offset.width}px ${offset.height}px ${radius}px ${color}`,
        };
    }
    return {
        textShadowColor: color,
        textShadowOffset: offset,
        textShadowRadius: radius,
    };
};
