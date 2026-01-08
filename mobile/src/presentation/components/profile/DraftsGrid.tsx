import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Clock, MoreVertical } from 'lucide-react-native';
import { Draft } from '../../../domain/entities/Draft';
import * as FileSystem from 'expo-file-system';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 2;
const PADDING = 2;
const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3);

interface DraftsGridProps {
  drafts: Draft[];
  isDark: boolean;
  onDraftPress: (draft: Draft) => void;
  onDraftLongPress: (draft: Draft) => void;
}

interface ValidatedDraft extends Draft {
  isValid?: boolean;
}

export const DraftsGrid: React.FC<DraftsGridProps> = ({
  drafts,
  isDark,
  onDraftPress,
  onDraftLongPress,
}) => {
  const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subtextColor = isDark ? '#A0A0A0' : '#6B6B6B';

  const [validDrafts, setValidDrafts] = React.useState<ValidatedDraft[]>([]);

  // Validate URIs on mount
  React.useEffect(() => {
    validateDraftURIs();
  }, [drafts]);

  const validateDraftURIs = async () => {
    const validated = await Promise.all(
      drafts.map(async (draft) => {
        try {
          const info = await FileSystem.getInfoAsync(draft.mediaUri);
          return { ...draft, isValid: info.exists };
        } catch {
          return { ...draft, isValid: false };
        }
      })
    );
    setValidDrafts(validated);
  };

  const getDaysText = (days: number) => {
    if (days === 0) return 'Bugün sona eriyor';
    if (days === 1) return '1 gün kaldı';
    return `${days} gün kaldı`;
  };

  if (drafts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: subtextColor }]}>
          Henüz taslak yok
        </Text>
        <Text style={[styles.emptySubtext, { color: subtextColor }]}>
          Video yüklerken "Taslağı Kaydet" butonunu kullanarak taslak oluşturabilirsiniz
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {validDrafts.map((draft, index) => (
        <Pressable
          key={draft.id}
          style={[
            styles.draftItem,
            { backgroundColor: bgColor },
            index % 3 !== 2 && { marginRight: GAP },
            { marginBottom: GAP },
          ]}
          onPress={() => onDraftPress(draft)}
          onLongPress={() => onDraftLongPress(draft)}
        >
          <Image
            source={{ uri: draft.thumbnailUri || draft.mediaUri }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    marginTop: 5,
  },
  draftItem: {
    width: ITEM_WIDTH,
    aspectRatio: 0.8, // 4:5 portrait ratio
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  invalidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invalidText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  expirationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expirationText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  moreButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
