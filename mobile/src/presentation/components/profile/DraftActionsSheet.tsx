import React, { forwardRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Edit3, Share2, Trash2 } from 'lucide-react-native';
import { Draft } from '../../../domain/entities/Draft';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

interface DraftActionsSheetProps {
  draft: Draft | null;
  isDark: boolean;
  onEdit: (draft: Draft) => void;
  onShare: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
}

export const DraftActionsSheet = forwardRef<BottomSheet, DraftActionsSheetProps>(
  ({ draft, isDark, onEdit, onShare, onDelete }, ref) => {
    const modalTheme = useSurfaceTheme(isDark);
    const snapPoints = useMemo(() => ['30%'], []);

    const textColor = modalTheme.textPrimary;
    const borderColor = modalTheme.sheetBorder;

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const handleEdit = () => {
      if (draft) {
        (ref as any).current?.close();
        onEdit(draft);
      }
    };

    const handleShare = () => {
      if (draft) {
        (ref as any).current?.close();
        onShare(draft);
      }
    };

    const handleDelete = () => {
      if (draft) {
        (ref as any).current?.close();
        Alert.alert(
          'Taslağı Sil',
          'Bu taslağı silmek istediğinizden emin misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Sil',
              style: 'destructive',
              onPress: () => onDelete(draft),
            },
          ]
        );
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={modalTheme.styles.sheetBackground}
        handleIndicatorStyle={modalTheme.styles.sheetHandle}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: textColor }]}>
            Taslak İşlemleri
          </Text>

          <Pressable
            style={[styles.actionItem, { borderBottomColor: borderColor }]}
            onPress={handleEdit}
          >
            <Edit3 size={22} color={textColor} />
            <Text style={[styles.actionText, { color: textColor }]}>
              Düzenle ve Paylaş
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionItem, { borderBottomColor: borderColor }]}
            onPress={handleShare}
          >
            <Share2 size={22} color={textColor} />
            <Text style={[styles.actionText, { color: textColor }]}>Paylaş</Text>
          </Pressable>

          <Pressable
            style={[styles.actionItem, { borderBottomWidth: 0 }]}
            onPress={handleDelete}
          >
            <Trash2 size={22} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>
              Taslağı Sil
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
