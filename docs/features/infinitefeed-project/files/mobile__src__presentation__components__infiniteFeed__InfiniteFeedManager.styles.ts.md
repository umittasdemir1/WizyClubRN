# mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.styles.ts

InfiniteFeedManager icin ortak stil tanimlari.

```ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    footerLoader: {
        marginVertical: 18,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    retryText: {
        fontSize: 13,
        fontWeight: '700',
    },
});

```
