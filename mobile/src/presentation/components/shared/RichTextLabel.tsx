import React, { useMemo } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { parseRichTextSegments } from '../../../core/utils/richText';

interface RichTextLabelProps extends Omit<TextProps, 'children'> {
    text: string | null | undefined;
    onHashtagPress?: (hashtag: string) => void;
    hashtagStyle?: TextStyle;
}

const HASHTAG_REGEX = /(#[^\s#]+)/g;

export function RichTextLabel({ text, onHashtagPress, hashtagStyle, ...textProps }: RichTextLabelProps) {
    const segments = useMemo(() => parseRichTextSegments(text), [text]);

    const renderText = (content: string, key: string, baseStyle?: any) => {
        if (!onHashtagPress) {
            return <Text key={key} style={baseStyle}>{content}</Text>;
        }

        const parts = content.split(HASHTAG_REGEX);
        if (parts.length === 1) {
            return <Text key={key} style={baseStyle}>{content}</Text>;
        }

        return parts.map((part, i) => {
            if (HASHTAG_REGEX.test(part)) {
                HASHTAG_REGEX.lastIndex = 0;
                return (
                    <Text
                        key={`${key}-${i}`}
                        style={[baseStyle, styles.hashtag, hashtagStyle]}
                        onPress={() => onHashtagPress(part.replace(/^#/, ''))}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={`${key}-${i}`} style={baseStyle}>{part}</Text>;
        });
    };

    return (
        <Text {...textProps}>
            {segments.map((segment, index) => {
                const segmentStyle = [
                    segment.bold && styles.bold,
                    segment.italic && styles.italic,
                    segment.underline && styles.underline,
                ].filter(Boolean);

                return renderText(
                    segment.text,
                    `${index}-${segment.text.length}`,
                    segmentStyle.length > 0 ? segmentStyle : undefined
                );
            })}
        </Text>
    );
}

const styles = StyleSheet.create({
    bold: {
        fontWeight: '700',
    },
    italic: {
        fontStyle: 'italic',
    },
    underline: {
        textDecorationLine: 'underline',
    },
    hashtag: {
        fontWeight: '600',
    },
});
