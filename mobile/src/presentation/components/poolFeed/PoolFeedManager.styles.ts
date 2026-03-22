import { StyleSheet } from 'react-native';
import { COLORS } from '../../../core/constants';

/**
 * Styles for the FeedManager component.
 * Centralized here to reduce file size of the main orchestrator.
 */
export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 16,
    },
    retryText: {
        color: '#FFF',
        textDecorationLine: 'underline',
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#FFF',
    },
    emptySubtext: {
        color: '#aaa',
    },
    footerLoader: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    scrollLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
});
