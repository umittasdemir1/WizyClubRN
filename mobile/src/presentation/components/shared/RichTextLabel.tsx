import React, { useMemo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { parseRichTextSegments } from '../../../core/utils/richText';

interface RichTextLabelProps extends Omit<TextProps, 'children'> {
    text: string | null | undefined;
}

export function RichTextLabel({ text, ...textProps }: RichTextLabelProps) {
    const segments = useMemo(() => parseRichTextSegments(text), [text]);

    return (
        <Text {...textProps}>
            {segments.map((segment, index) => (
                <Text
                    key={`${index}-${segment.text.length}`}
                    style={[
                        segment.bold && styles.bold,
                        segment.italic && styles.italic,
                        segment.underline && styles.underline,
                    ]}
                >
                    {segment.text}
                </Text>
            ))}
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
});
