import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import BottomSheet from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useDraftStore } from '../src/presentation/store/useDraftStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { DraftsGrid } from '../src/presentation/components/profile/DraftsGrid';
import { DraftActionsSheet } from '../src/presentation/components/profile/DraftActionsSheet';
import { Draft } from '../src/domain/entities/Draft';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import * as ImagePicker from 'expo-image-picker';

export default function DraftsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { drafts, fetchDrafts, deleteDraft } = useDraftStore();
  const [selectedDraft, setSelectedDraft] = React.useState<Draft | null>(null);
  const draftActionsSheetRef = useRef<BottomSheet>(null);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#080A0F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#080A0F';

  // Fetch drafts on mount
  useEffect(() => {
    if (user?.id) {
      fetchDrafts(user.id);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      SystemBars.setStyle({
        statusBar: isDark ? 'light' : 'dark',
        navigationBar: isDark ? 'light' : 'dark',
      });
    }, [isDark])
  );

  const handleDraftPress = (draft: Draft) => {
    handleEditDraft(draft);
  };

  const handleDraftLongPress = (draft: Draft) => {
    setSelectedDraft(draft);
    draftActionsSheetRef.current?.expand();
  };

  const handleEditDraft = (draft: Draft) => {
    // Convert Draft entity to UploadComposerDraft
    useUploadComposerStore.getState().setDraft({
      selectedAssets: [{
        uri: draft.mediaUri,
        type: draft.mediaType,
        width: 0,
        height: 0,
      } as ImagePicker.ImagePickerAsset],
      uploadMode: draft.uploadMode,
      coverAssetIndex: 0,
      playbackRate: 1,
      videoVolume: 1,
      cropRatio: '9:16',
      filterPreset: 'none',
      qualityPreset: 'medium',
      subtitleLanguage: 'auto',
      trimStartSec: 0,
      trimEndSec: 0,
    });

    router.push('/upload-composer');
  };

  const handleShareDraft = (draft: Draft) => {
    // TODO: Share draft as-is (skip to upload)
    Alert.alert('Taslağı Paylaş', 'Paylaşma özelliği yakında eklenecek.');
  };

  const handleDeleteDraft = async (draft: Draft) => {
    try {
      await deleteDraft(draft.id);
      Alert.alert('Başarılı', 'Taslak silindi.');
    } catch (error) {
      Alert.alert('Hata', 'Taslak silinirken bir hata oluştu.');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Taslaklar',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView style={styles.content}>
          <DraftsGrid
            drafts={drafts}
            isDark={isDark}
            onDraftPress={handleDraftPress}
            onDraftLongPress={handleDraftLongPress}
          />
        </ScrollView>

        <DraftActionsSheet
          ref={draftActionsSheetRef}
          draft={selectedDraft}
          isDark={isDark}
          onEdit={handleEditDraft}
          onShare={handleShareDraft}
          onDelete={handleDeleteDraft}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
