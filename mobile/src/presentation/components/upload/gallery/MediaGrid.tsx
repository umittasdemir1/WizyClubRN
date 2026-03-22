import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { EdgeInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
export const CELL_WIDTH = Math.floor((SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);
export const CELL_HEIGHT = Math.round(CELL_WIDTH * (4 / 3));
const THUMB_SIZE = CELL_WIDTH * 2;

interface MediaGridProps {
    assets: MediaLibrary.Asset[];
    isLoading: boolean;
    insets: EdgeInsets;
    loadAssets: (reset: boolean) => Promise<void>;
    isSelectionMode: boolean;
    setIsSelectionMode: (mode: boolean) => void;
    selectedIds: string[];
    setSelectedIds: (ids: string[]) => void;
    commitSingleSelection: (asset: MediaLibrary.Asset) => void;
    commitMultiSelection: () => void;
    toggleSelect: (id: string) => void;
    formatDuration: (val?: number) => string;
}

export const MediaGrid = ({
    assets,
    isLoading,
    insets,
    loadAssets,
    isSelectionMode,
    setIsSelectionMode,
    selectedIds,
    setSelectedIds,
    commitSingleSelection,
    commitMultiSelection,
    toggleSelect,
    formatDuration,
}: MediaGridProps) => {
    return (
        <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
            columnWrapperStyle={styles.row}
            initialNumToRender={12}
            maxToRenderPerBatch={9}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
            getItemLayout={(_, index) => ({
                length: CELL_HEIGHT + GRID_GAP,
                offset: (CELL_HEIGHT + GRID_GAP) * Math.floor(index / NUM_COLUMNS),
                index,
            })}
            onEndReachedThreshold={0.5}
            onEndReached={() => void loadAssets(false)}
            ListFooterComponent={isLoading ? <ActivityIndicator style={styles.loader} color="#FFF" /> : null}
            renderItem={({ item }) => {
                const selectedIndex = selectedIds.indexOf(item.id);
                const isSelected = selectedIndex >= 0;
                return (
                    <Pressable
                        onPress={() => {
                            if (!isSelectionMode) {
                                commitSingleSelection(item);
                                return;
                            }
                            toggleSelect(item.id);
                        }}
                        onLongPress={() => {
                            if (!isSelectionMode) {
                                setIsSelectionMode(true);
                                setSelectedIds([item.id]);
                                return;
                            }
                            if (isSelected && selectedIds.length > 0) {
                                commitMultiSelection();
                                return;
                            }
                            toggleSelect(item.id);
                        }}
                        delayLongPress={220}
                        style={styles.cell}
                    >
                        <Image
                            source={{ uri: item.uri, width: THUMB_SIZE, height: THUMB_SIZE }}
                            style={styles.image}
                            contentFit="cover"
                            transition={0}
                            recyclingKey={item.id}
                            cachePolicy="memory-disk"
                        />
                        {item.mediaType === 'video' ? (
                            <View style={styles.durationBadge}>
                                <Text style={styles.durationBadgeText}>{formatDuration(item.duration)}</Text>
                            </View>
                        ) : null}
                        {isSelectionMode ? (
                            <View style={[styles.selectBadge, isSelected ? styles.selectBadgeActive : null]}>
                                {isSelected ? (
                                    <Text style={styles.selectBadgeText}>{selectedIndex + 1}</Text>
                                ) : (
                                    <Check size={14} color="transparent" />
                                )}
                            </View>
                        ) : null}
                    </Pressable>
                );
            }}
        />
    );
};

const styles = StyleSheet.create({
    row: {
        gap: GRID_GAP,
        marginBottom: GRID_GAP,
    },
    cell: {
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
        backgroundColor: '#111827',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    durationBadge: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        paddingHorizontal: 6,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    selectBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#FFF',
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectBadgeActive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
    },
    selectBadgeText: {
        color: '#080A0F',
        fontSize: 12,
        fontWeight: '700',
    },
    loader: {
        marginVertical: 16,
    },
});
