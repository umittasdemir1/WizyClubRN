import type { SubtitleTextAlign } from '../../domain/entities/Subtitle';

/**
 * Resolves a SubtitleTextAlign domain value to a CSS-like text alignment.
 */
export function resolveSubtitleTextAlign(
    textAlign: SubtitleTextAlign | undefined
): 'left' | 'center' | 'right' {
    if (textAlign === 'center') return 'center';
    if (textAlign === 'end' || textAlign === 'right') return 'right';
    return 'left';
}
