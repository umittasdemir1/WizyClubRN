import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    Image,
    Dimensions,
    StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Folder } from 'lucide-react-native';
import { useThemeStore } from '../src/presentation/store/useThemeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CreatePostScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isDark = useThemeStore((state) => state.isDark);

    // States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [selectedBoard, setSelectedBoard] = useState('Profil');

    // Parse media IDs
    const mediaIds = params.mediaIds ? JSON.parse(params.mediaIds as string) : [];

    const handleGoBack = () => {
        router.back();
    };

    const handleCreate = () => {
        console.log('Creating post with:', {
            title,
            description,
            link,
            selectedBoard,
            mediaIds,
        });
        // TODO: Implement upload logic
        router.push('/');
    };

    const bgColor = isDark ? '#121212' : '#FFFFFF';
    const textColor = isDark ? '#fff' : '#000';
    const secondaryTextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? '#1f1f1f' : '#f5f5f5';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
            <RNStatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={bgColor}
            />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
                <Pressable onPress={handleGoBack} style={styles.backButton}>
                    <ChevronLeft size={28} color={textColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textColor }]}>Pin Oluştur</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Preview Card */}
                <View style={styles.previewContainer}>
                    <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
                        <View style={styles.previewImage}>
                            <View style={styles.durationBadge}>
                                <Text style={styles.durationText}>0:10</Text>
                            </View>
                            <Text style={[styles.previewPlaceholder, { color: secondaryTextColor }]}>
                                Önizleme
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Title Input */}
                <View style={[styles.formGroup, { backgroundColor: cardBg }]}>
                    <Text style={[styles.label, { color: textColor }]}>Başlık</Text>
                    <TextInput
                        style={[styles.input, { color: textColor }]}
                        placeholder="Pininizin ne hakkında olduğunu herkese söyleyin"
                        placeholderTextColor={secondaryTextColor}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />
                    <Text style={[styles.charCounter, { color: secondaryTextColor }]}>
                        {title.length}/100
                    </Text>
                </View>

                {/* Description Input */}
                <View style={[styles.formGroup, { backgroundColor: cardBg }]}>
                    <Text style={[styles.label, { color: textColor }]}>Açıklama</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { color: textColor }]}
                        placeholder="Pin'inize bir açıklama, bahsetme veya konu etiketi ekleyin"
                        placeholderTextColor={secondaryTextColor}
                        value={description}
                        onChangeText={setDescription}
                        maxLength={800}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <Text style={[styles.charCounter, { color: secondaryTextColor }]}>
                        {description.length}/800
                    </Text>
                </View>

                {/* Options */}
                <View style={[styles.formGroup, { backgroundColor: cardBg }]}>
                    {/* Link */}
                    <Pressable style={[styles.formRow, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.formRowLabel, { color: textColor }]}>Bağlantı</Text>
                        <View style={styles.formRowRight}>
                            <Text style={[styles.formRowValue, { color: secondaryTextColor }]}>
                                Bağlantınızı buraya ekleyin
                            </Text>
                            <ChevronRight size={20} color={secondaryTextColor} />
                        </View>
                    </Pressable>

                    {/* Board Selection */}
                    <Pressable style={[styles.formRow, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.formRowLabel, { color: textColor }]}>Bir pano seçin</Text>
                        <View style={styles.formRowRight}>
                            <Text style={[styles.formRowValue, { color: secondaryTextColor }]}>
                                {selectedBoard}
                            </Text>
                            <ChevronRight size={20} color={secondaryTextColor} />
                        </View>
                    </Pressable>

                    {/* Tag Topics */}
                    <Pressable style={[styles.formRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.formRowLabel, { color: textColor }]}>Konuları etiketle</Text>
                        <View style={styles.formRowRight}>
                            <ChevronRight size={20} color={secondaryTextColor} />
                        </View>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                <Pressable style={styles.folderButton}>
                    <Folder size={24} color={textColor} />
                </Pressable>
                <Pressable onPress={handleCreate} style={styles.createButton}>
                    <Text style={styles.createButtonText}>Oluştur</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    previewCard: {
        width: 200,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    previewImage: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    durationBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    durationText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    previewPlaceholder: {
        fontSize: 14,
    },
    formGroup: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        padding: 0,
    },
    textArea: {
        minHeight: 80,
    },
    charCounter: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 8,
    },
    formRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    formRowLabel: {
        fontSize: 15,
    },
    formRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    formRowValue: {
        fontSize: 15,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        borderTopWidth: 1,
    },
    folderButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButton: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: '#e60023',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
