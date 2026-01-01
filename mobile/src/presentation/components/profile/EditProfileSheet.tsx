import React, { forwardRef, useState, useMemo, useEffect } from 'react';
import { Dimensions, ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable, Alert } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { RefreshCcw, XCircle, ChevronRight, PlusCircle, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';
import { User } from '../../../domain/entities/User';
import { ProfileRepositoryImpl } from '../../../data/repositories/ProfileRepositoryImpl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const profileRepo = new ProfileRepositoryImpl();

interface EditProfileSheetProps {
  user: User;
  onUpdateProfile: (updates: Partial<User>) => Promise<any>;
  onUploadAvatar: (uri: string) => Promise<string | null>;
  onUpdateCompleted?: () => void;
}

type SubViewType = 'name' | 'username' | 'bio' | 'socialLinks' | null;

export const EditProfileSheet = forwardRef<BottomSheet, EditProfileSheetProps>(
  ({ user, onUpdateProfile, onUploadAvatar, onUpdateCompleted }, ref) => {
    const { isDark } = useThemeStore();
    const insets = useSafeAreaInsets();

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const [activeSubView, setActiveSubView] = useState<SubViewType>(null);
    const [isAvatarZoomed, setIsAvatarZoomed] = useState(false);
    const [currentAvatar, setCurrentAvatar] = useState(user.avatarUrl);

    const [isSaving, setIsSaving] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    // Form States
    const [tempName, setTempName] = useState(user.fullName || '');
    const [tempUsername, setTempUsername] = useState(user.username || '');
    const [tempBio, setTempBio] = useState(user.bio || '');
    const [tempWebsite, setTempWebsite] = useState(user.website || '');

    // Social Links States
    const [tempInstagram, setTempInstagram] = useState(user.instagramUrl || '');
    const [tempTiktok, setTempTiktok] = useState(user.tiktokUrl || '');
    const [tempYoutube, setTempYoutube] = useState(user.youtubeUrl || '');
    const [tempX, setTempX] = useState(user.xUrl || '');

    // Sync internal state when user prop changes
    useEffect(() => {
      setTempName(user.fullName || user.username);
      setTempUsername(user.username);
      setTempBio(user.bio || '');
      setTempWebsite(user.website || '');
      setCurrentAvatar(user.avatarUrl);

      setTempInstagram(user.instagramUrl || '');
      setTempTiktok(user.tiktokUrl || '');
      setTempYoutube(user.youtubeUrl || '');
      setTempX(user.xUrl || '');
    }, [user]);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

    const bgColor = isDark ? '#1c1c1e' : themeColors.background;
    const textColor = themeColors.textPrimary;
    const secondaryTextColor = themeColors.textSecondary;
    const borderColor = themeColors.border;
    const handleColor = isDark ? '#fff' : '#000';

    const handleClose = () => {
      if (ref && 'current' in ref && ref.current) {
        setActiveSubView(null);
        ref.current.close();
      }
    };

    const handleSaveAll = async () => {
      setIsSaving(true);
      setUsernameError(null);

      try {
        // 1. Check if username has changed and validate availability
        const usernameChanged = tempUsername !== user.username;
        if (usernameChanged) {
          const isAvailable = await profileRepo.checkUsernameAvailability(tempUsername, user.id);
          if (!isAvailable) {
            Alert.alert(
              'Kullanıcı Adı Kullanımda',
              'Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.',
              [{ text: 'Tamam' }]
            );
            setUsernameError('Bu kullanıcı adı zaten kullanılıyor');
            setIsSaving(false);
            return;
          }
        }

        // 2. Upload avatar if changed
        let avatarUrl = currentAvatar;
        if (currentAvatar !== user.avatarUrl && currentAvatar.startsWith('file://')) {
          const uploadedUrl = await onUploadAvatar(currentAvatar);
          if (uploadedUrl) avatarUrl = uploadedUrl;
        }

        // 3. Build update object - only include username if it changed
        const updates: Partial<User> = {
          fullName: tempName,
          bio: tempBio,
          avatarUrl: avatarUrl,
          website: tempWebsite,
          instagramUrl: tempInstagram,
          tiktokUrl: tempTiktok,
          youtubeUrl: tempYoutube,
          xUrl: tempX
        };

        // Only include username if it actually changed
        if (usernameChanged) {
          updates.username = tempUsername;
        }

        // 4. Update profile
        await onUpdateProfile(updates);

        onUpdateCompleted?.();
        handleClose();
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert(
          'Hata',
          'Profil kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } finally {
        setIsSaving(false);
      }
    };

    const handleSaveSocialLinks = async () => {
      setIsSaving(true);
      try {
        await onUpdateProfile({
          instagramUrl: tempInstagram,
          tiktokUrl: tempTiktok,
          youtubeUrl: tempYoutube,
          xUrl: tempX,
          website: tempWebsite
        });
        onUpdateCompleted?.();
        setActiveSubView(null);
      } catch (error) {
        console.error('Error saving social links:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setCurrentAvatar(result.assets[0].uri);
      }
    };

    const renderMainView = () => (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={{ color: textColor, fontSize: 16 }}>Vazgeç</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Profili Düzenle</Text>
          <TouchableOpacity onPress={handleSaveAll} style={styles.saveButton}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Bitti</Text>
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Pressable onPress={() => setIsAvatarZoomed(true)}>
                <Image source={{ uri: currentAvatar }} style={styles.avatar} />
              </Pressable>
              <TouchableOpacity
                style={[styles.editIconContainer, { backgroundColor: bgColor, borderColor: borderColor }]}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <RefreshCcw size={14} color={textColor} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.formSection, { borderTopColor: borderColor, borderBottomColor: borderColor }]}>
            <TouchableOpacity style={[styles.clickableRow, { borderBottomColor: borderColor }]} onPress={() => setActiveSubView('name')}>
              <Text style={[styles.label, { color: textColor }]}>Ad</Text>
              <Text style={[styles.valueText, { color: textColor }]} numberOfLines={1}>{tempName}</Text>
              <ChevronRight size={18} color={secondaryTextColor} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.clickableRow, { borderBottomColor: borderColor }]} onPress={() => setActiveSubView('username')}>
              <Text style={[styles.label, { color: textColor }]}>Kullanıcı Adı</Text>
              <Text style={[styles.valueText, { color: textColor }]} numberOfLines={1}>{tempUsername}</Text>
              <ChevronRight size={18} color={secondaryTextColor} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.clickableRow, { borderBottomColor: borderColor }]} onPress={() => setActiveSubView('bio')}>
              <Text style={[styles.label, { color: textColor }]}>Biyografi</Text>
              <Text style={[styles.valueText, { color: textColor }]} numberOfLines={1}>{tempBio || 'Biyografi ekle'}</Text>
              <ChevronRight size={18} color={secondaryTextColor} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.clickableRow} onPress={() => setActiveSubView('socialLinks')}>
              <Text style={[styles.label, { color: textColor }]}>Bağlantılar</Text>
              <Text style={[styles.valueText, { color: secondaryTextColor }]}>
                Düzenle
              </Text>
              <ChevronRight size={18} color={secondaryTextColor} />
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </Animated.View>
    );

    const renderNameEdit = () => (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => setActiveSubView(null)} style={styles.closeButton}>
            <Text style={{ color: textColor, fontSize: 16 }}>İptal</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Ad</Text>
          <TouchableOpacity onPress={() => setActiveSubView(null)} style={styles.saveButton}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.subViewContent}>
          <Text style={[styles.subViewTitle, { color: secondaryTextColor }]}>Ad</Text>
          <Text style={[styles.subViewDesc, { color: secondaryTextColor }]}>
            Adınızı 30 gün içerisinde yalnızca bir kez değiştirebilirsiniz.
          </Text>

          <View style={[styles.inputWrapper, { borderBottomColor: borderColor }]}>
            <View style={styles.inputContainer}>
              <BottomSheetTextInput
                style={[styles.subViewInput, { color: textColor }]}
                value={tempName}
                onChangeText={(text) => text.length <= 30 && setTempName(text)}
                autoFocus
              />
              {tempName.length > 0 && (
                <TouchableOpacity onPress={() => setTempName('')}>
                  <XCircle size={18} color={secondaryTextColor} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.charCountBottom, { color: secondaryTextColor }]}>{tempName.length}/30</Text>
          </View>
        </View>
      </Animated.View>
    );

    const renderUsernameEdit = () => (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => { setActiveSubView(null); setUsernameError(null); }} style={styles.closeButton}>
            <Text style={{ color: textColor, fontSize: 16 }}>İptal</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Kullanıcı Adı</Text>
          <TouchableOpacity onPress={() => { setActiveSubView(null); setUsernameError(null); }} style={styles.saveButton}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.subViewContent}>
          <Text style={[styles.subViewTitle, { color: secondaryTextColor }]}>Kullanıcı Adı</Text>
          <Text style={[styles.subViewDesc, { color: secondaryTextColor }]}>
            Kullanıcı adınızı 90 gün içerisinde yalnızca bir kez değiştirebilirsiniz. Kullanıcı adları yalnızca harf, rakam, alt çizgi ve nokta içerebilir.
          </Text>

          <View style={[styles.inputWrapper, { borderBottomColor: usernameError ? '#FF3B30' : borderColor }]}>
            <View style={styles.inputContainer}>
              <BottomSheetTextInput
                style={[styles.subViewInput, { color: textColor }]}
                value={tempUsername}
                onChangeText={(text) => {
                  const filtered = text.replace(/[^a-zA-Z0-9_.]/g, '');
                  if (filtered.length <= 35) {
                    setTempUsername(filtered.toLowerCase());
                    setUsernameError(null); // Clear error on change
                  }
                }}
                autoFocus
                autoCapitalize="none"
              />
              {tempUsername.length > 0 && (
                <TouchableOpacity onPress={() => { setTempUsername(''); setUsernameError(null); }}>
                  <XCircle size={18} color={secondaryTextColor} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.usernameFooter}>
              <Text style={[styles.urlPreview, { color: secondaryTextColor }]}>
                www.wizyclub.com/@{tempUsername || 'kullaniciadi'}
              </Text>
              <Text style={[styles.charCountBottom, { color: secondaryTextColor }]}>{tempUsername.length}/35</Text>
            </View>
            {usernameError && (
              <Text style={styles.errorText}>
                {usernameError}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    );

    const renderBioEdit = () => (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => setActiveSubView(null)} style={styles.closeButton}>
            <Text style={{ color: textColor, fontSize: 16 }}>İptal</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Biyografi</Text>
          <TouchableOpacity onPress={() => setActiveSubView(null)} style={styles.saveButton}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.subViewContent}>
          <Text style={[styles.subViewTitle, { color: secondaryTextColor }]}>Biyografi</Text>

          <View style={[styles.inputWrapper, { borderBottomColor: borderColor }]}>
            <View style={styles.inputContainer}>
              <BottomSheetTextInput
                style={[styles.subViewInput, { color: textColor, minHeight: 100, textAlignVertical: 'top' }]}
                value={tempBio}
                onChangeText={(text) => text.length <= 250 && setTempBio(text)}
                multiline
                autoFocus
              />
              {tempBio.length > 0 && (
                <TouchableOpacity onPress={() => setTempBio('')} style={{ alignSelf: 'flex-start', paddingTop: 4 }}>
                  <XCircle size={18} color={secondaryTextColor} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.charCountBottom, { color: secondaryTextColor }]}>{tempBio.length}/250</Text>
          </View>
        </View>
      </Animated.View>
    );

    const renderSocialLinksEdit = () => (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => setActiveSubView(null)} style={styles.closeButton}>
            <Text style={{ color: textColor, fontSize: 16 }}>İptal</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Bağlantılar</Text>
          <TouchableOpacity onPress={handleSaveSocialLinks} style={styles.saveButton}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView contentContainerStyle={[styles.contentContainer, { paddingHorizontal: 16 }]}>
          <View style={[styles.inputWrapper, { borderBottomColor: borderColor, marginBottom: 20 }]}>
            <Text style={[styles.subViewTitle, { color: secondaryTextColor, marginBottom: 8 }]}>Website</Text>
            <BottomSheetTextInput
              style={[styles.subViewInput, { color: textColor }]}
              value={tempWebsite}
              onChangeText={setTempWebsite}
              placeholder="https://mysite.com"
              placeholderTextColor={secondaryTextColor}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrapper, { borderBottomColor: borderColor, marginBottom: 20 }]}>
            <Text style={[styles.subViewTitle, { color: secondaryTextColor, marginBottom: 8 }]}>Instagram</Text>
            <BottomSheetTextInput
              style={[styles.subViewInput, { color: textColor }]}
              value={tempInstagram}
              onChangeText={setTempInstagram}
              placeholder="Instagram profile URL"
              placeholderTextColor={secondaryTextColor}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrapper, { borderBottomColor: borderColor, marginBottom: 20 }]}>
            <Text style={[styles.subViewTitle, { color: secondaryTextColor, marginBottom: 8 }]}>TikTok</Text>
            <BottomSheetTextInput
              style={[styles.subViewInput, { color: textColor }]}
              value={tempTiktok}
              onChangeText={setTempTiktok}
              placeholder="TikTok profile URL"
              placeholderTextColor={secondaryTextColor}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrapper, { borderBottomColor: borderColor, marginBottom: 20 }]}>
            <Text style={[styles.subViewTitle, { color: secondaryTextColor, marginBottom: 8 }]}>YouTube</Text>
            <BottomSheetTextInput
              style={[styles.subViewInput, { color: textColor }]}
              value={tempYoutube}
              onChangeText={setTempYoutube}
              placeholder="YouTube channel URL"
              placeholderTextColor={secondaryTextColor}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrapper, { borderBottomColor: borderColor, marginBottom: 20 }]}>
            <Text style={[styles.subViewTitle, { color: secondaryTextColor, marginBottom: 8 }]}>X (Twitter)</Text>
            <BottomSheetTextInput
              style={[styles.subViewInput, { color: textColor }]}
              value={tempX}
              onChangeText={setTempX}
              placeholder="X profile URL"
              placeholderTextColor={secondaryTextColor}
              autoCapitalize="none"
            />
          </View>
        </BottomSheetScrollView>
      </Animated.View>
    );

    return (
      <>
        <BottomSheet
          ref={ref}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backgroundStyle={{
            backgroundColor: bgColor,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleIndicatorStyle={{ backgroundColor: handleColor }}
          index={-1}
        >
          <BottomSheetView style={styles.container}>
            {activeSubView === null && renderMainView()}
            {activeSubView === 'name' && renderNameEdit()}
            {activeSubView === 'username' && renderUsernameEdit()}
            {activeSubView === 'bio' && renderBioEdit()}
            {activeSubView === 'socialLinks' && renderSocialLinksEdit()}
          </BottomSheetView>
        </BottomSheet>

        <Modal visible={isAvatarZoomed} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalPressable} onPress={() => setIsAvatarZoomed(false)}>
              <Animated.View style={styles.zoomedAvatarContainer}>
                <Image source={{ uri: currentAvatar }} style={styles.zoomedAvatar} />
              </Animated.View>
              <Text style={styles.closeZoomText}>Kapatmak için dokun</Text>
            </Pressable>
          </View>
        </Modal>
      </>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  title: { fontSize: 16, fontWeight: '700' },
  closeButton: { padding: 8, marginLeft: -8 },
  saveButton: { padding: 8, marginRight: -8 },
  contentContainer: { paddingTop: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative', marginBottom: 12, width: 90, height: 90 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: { borderTopWidth: 0.5, borderBottomWidth: 0.5, marginBottom: 30 },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  label: { width: 100, fontSize: 15, fontWeight: '500' },
  valueText: { flex: 1, fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  input: { flex: 1, fontSize: 15, padding: 0, minHeight: 60 },
  subViewContent: { padding: 16, paddingTop: 24 },
  subViewTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  subViewDesc: { fontSize: 13, lineHeight: 18, marginBottom: 24 },
  inputWrapper: { borderBottomWidth: 1, paddingBottom: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  subViewInput: { flex: 1, fontSize: 16, padding: 0 },
  charCountBottom: { fontSize: 12, marginTop: 4, textAlign: 'right' },
  usernameFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  urlPreview: { fontSize: 12, marginTop: 4, flex: 1 },
  errorText: { fontSize: 12, marginTop: 4, color: '#FF3B30' },
  linksHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linksList: { marginTop: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  platformPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
  },
  linkInput: { flex: 1, fontSize: 14, padding: 0 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  pickerItem: { paddingVertical: 16, alignItems: 'center', borderTopWidth: 0.5 },
  pickerCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)', justifyContent: 'center', alignItems: 'center' },
  zoomedAvatarContainer: { shadowColor: "#000", shadowOpacity: 0.8, shadowRadius: 20, elevation: 20 },
  zoomedAvatar: { width: SCREEN_WIDTH * 0.75, height: SCREEN_WIDTH * 0.75, borderRadius: (SCREEN_WIDTH * 0.75) / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  closeZoomText: { marginTop: 40, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  modalPressable: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
});