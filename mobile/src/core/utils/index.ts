export const hapticLight = () => { };
export const hapticMedium = () => { };
export const hapticHeavy = () => { };
export const hapticSuccess = () => { };
export const hapticWarning = () => { };
export const hapticError = () => { };

// ===================================
// ⏱️ TIME FORMATTING
// ===================================
export const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ===================================
// 🔢 NUMBER FORMATTING
// ===================================
export const formatCount = (count: number): string => {
    if (!Number.isFinite(count)) return '0';

    const normalizedCount = Math.max(0, Math.floor(count));
    const hasFraction = (value: number): boolean => Math.abs(value - Math.trunc(value)) > Number.EPSILON;
    const formatInteger = (value: number): string =>
        new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);

    if (normalizedCount <= 999) {
        return formatInteger(normalizedCount);
    }

    if (normalizedCount <= 9999) {
        return formatInteger(normalizedCount);
    }

    if (normalizedCount <= 999999) {
        const inThousands = Math.floor((normalizedCount / 1000) * 10) / 10;
        const formatted = new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: hasFraction(inThousands) ? 1 : 0,
            maximumFractionDigits: 1,
        }).format(inThousands);
        return `${formatted} bin`;
    }

    const inMillions = Math.floor((normalizedCount / 1000000) * 10) / 10;
    const formatted = new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: hasFraction(inMillions) ? 1 : 0,
        maximumFractionDigits: 1,
    }).format(inMillions);
    return `${formatted} M`;
};

// ===================================
// 🎯 CLAMP
// ===================================
export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

// ===================================
// 📐 PERCENTAGE
// ===================================
export const toPercentage = (value: number, total: number): number => {
    if (total <= 0) return 0;
    return clamp(value / total, 0, 1);
};
