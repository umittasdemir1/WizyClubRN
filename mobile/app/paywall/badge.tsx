import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { ArrowLeft, BadgeCheck, Crown, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { DARK_COLORS, LIGHT_COLORS } from '../../src/core/constants';

const benefits = [
  { icon: BadgeCheck, title: 'Onay Rozeti', description: 'Profilinde mavi rozet ile daha fazla güven.' },
  { icon: ShieldCheck, title: 'Kimlik Koruması', description: 'Taklit hesaplara karşı ekstra koruma.' },
  { icon: Sparkles, title: 'Öne Çıkan Profil', description: 'Aramalarda ve keşfette daha görünür ol.' },
];

export default function BadgePaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalTone, setModalTone] = useState<'success' | 'error' | 'info'>('info');

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => pkg.identifier === selectedPackageId) ?? packages[0] ?? null;
  }, [packages, selectedPackageId]);

  const loadOfferings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      const availablePackages = currentOffering?.availablePackages ?? [];
      if (!currentOffering || availablePackages.length === 0) {
        setError('Şu an aktif bir paket bulunamadı.');
        setPackages([]);
        return;
      }
      setPackages(availablePackages);
      setSelectedPackageId(availablePackages[0].identifier);
    } catch (err) {
      setError('Paketler yüklenemedi. Lütfen tekrar dene.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const showModal = (title: string, message: string, tone: 'success' | 'error' | 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalTone(tone);
    setModalVisible(true);
  };

  const handlePurchase = async () => {
    if (isPurchasing) return;
    if (!user?.id) {
      showModal('Giriş gerekli', 'Rozet için kaydolmak için giriş yapmalısın.', 'info');
      return;
    }
    if (!selectedPackage) {
      showModal('Paket bulunamadı', 'Lütfen tekrar dene.', 'error');
      return;
    }
    setIsPurchasing(true);
    try {
      await Purchases.purchasePackage(selectedPackage);
      showModal('Başarılı', 'Rozet için kaydın tamamlandı.', 'success');
    } catch (err: any) {
      if (err?.userCancelled) return;
      showModal('Satın alma başarısız', err?.message || 'Beklenmeyen bir hata oluştu.', 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  const background = themeColors.background;
  const textPrimary = themeColors.textPrimary;
  const textSecondary = themeColors.textSecondary;
  const cardBg = themeColors.card;
  const modalAccent = modalTone === 'success'
    ? '#2ECC71'
    : modalTone === 'error'
      ? '#FF3B30'
      : '#0B84FF';

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Mavi Rozet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: cardBg }]}>
          <View style={styles.heroBadge}>
            <Crown size={20} color="#0B84FF" />
            <Text style={[styles.heroBadgeText, { color: textPrimary }]}>WizyClub Verified</Text>
          </View>
          <Text style={[styles.heroTitle, { color: textPrimary }]}>Hesabını resmileştir</Text>
          <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
            Güven, görünürlük ve ekstra koruma ile mavi rozet ayrıcalıklarını aç.
          </Text>
        </View>

        <View style={styles.benefits}>
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={[styles.benefitCard, { backgroundColor: cardBg }]}>
                <View style={styles.benefitIcon}>
                  <Icon size={20} color="#0B84FF" />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.benefitDescription, { color: textSecondary }]}>{item.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.packages}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Planını seç</Text>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={textPrimary} />
              <Text style={[styles.loadingText, { color: textSecondary }]}>Paketler yükleniyor...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={[styles.errorText, { color: textSecondary }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryButton, { borderColor: textSecondary }]} onPress={loadOfferings}>
                <Text style={[styles.retryText, { color: textPrimary }]}>Tekrar dene</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.packageList}>
              {packages.map((pkg) => {
                const isSelected = pkg.identifier === selectedPackage?.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      { borderColor: isSelected ? '#0B84FF' : 'transparent', backgroundColor: cardBg },
                    ]}
                    onPress={() => setSelectedPackageId(pkg.identifier)}
                  >
                    <View>
                      <Text style={[styles.packageTitle, { color: textPrimary }]}>
                        {pkg.product.title || 'Rozet Paketi'}
                      </Text>
                      <Text style={[styles.packageDescription, { color: textSecondary }]}>
                        {pkg.product.description || 'Profiline mavi rozet ekle.'}
                      </Text>
                    </View>
                    <Text style={[styles.packagePrice, { color: textPrimary }]}>
                      {pkg.product.priceString}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: background }]}>
        <TouchableOpacity
          style={[styles.ctaButton, isPurchasing && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing || !!error || isLoading}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Rozeti Aktifleştir</Text>
          )}
        </TouchableOpacity>
        <Text style={[styles.footerNote, { color: textSecondary }]}>
          İstediğin zaman iptal edebilirsin.
        </Text>
      </View>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={[styles.modalBadge, { backgroundColor: `${modalAccent}20` }]}>
              <BadgeCheck size={20} color={modalAccent} />
            </View>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>{modalTitle}</Text>
            <Text style={[styles.modalMessage, { color: textSecondary }]}>{modalMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: modalAccent }]}
              onPress={() => {
                setModalVisible(false);
                if (modalTone === 'success') {
                  router.back();
                }
              }}
            >
              <Text style={styles.modalButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 140,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(11,132,255,0.12)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 14,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  benefits: {
    marginTop: 18,
    gap: 12,
  },
  benefitCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(11,132,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  benefitDescription: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  packages: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  errorCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  packageList: {
    gap: 12,
  },
  packageCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  packageDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  packagePrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  ctaButton: {
    backgroundColor: '#0B84FF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
