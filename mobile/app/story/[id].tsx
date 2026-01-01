import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';
import { StoryViewer } from '../../src/presentation/components/story/StoryViewer';

export default function StoryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { stories, isLoading, currentIndex, goToNext, goToPrev } = useStoryViewer(id);

    if (isLoading || stories.length === 0) {
        return <View style={styles.container} />;
    }

    return (
        <StoryViewer 
            stories={stories} 
            initialIndex={currentIndex}
            onNext={goToNext}
            onPrev={goToPrev}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
});
