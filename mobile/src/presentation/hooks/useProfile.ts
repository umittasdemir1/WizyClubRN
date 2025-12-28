import { useState, useEffect, useCallback } from 'react';
import { User, SocialLink } from '../../domain/entities';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';

const profileRepo = new ProfileRepositoryImpl();

export const useProfile = (userId: string, viewerId?: string) => {
    const [user, setUser] = useState<User | null>(null);
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('[useProfile] Loading profile for user ID:', userId);
            const [profileData, linksData] = await Promise.all([
                profileRepo.getProfile(userId, viewerId),
                profileRepo.getSocialLinks(userId)
            ]);
            console.log('[useProfile] Profile data loaded:', profileData);
            console.log('[useProfile] Social links loaded:', linksData);
            setUser(profileData);
            setSocialLinks(linksData);
        } catch (err) {
            setError('Profil yüklenirken bir hata oluştu.');
            console.error('[useProfile] Load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, viewerId]);

    useEffect(() => {
        if (userId) {
            loadProfile();
        }
    }, [loadProfile, userId]);

    const updateProfile = useCallback(async (updates: Partial<User>) => {
        try {
            console.log('[useProfile] Updating profile with:', updates);
            const updatedUser = await profileRepo.updateProfile(userId, updates);
            console.log('[useProfile] Update response:', updatedUser);

            // Force reload from database to ensure state is in sync
            await loadProfile();

            return updatedUser;
        } catch (err) {
            console.error('[useProfile] Update error:', err);
            setError('Profil güncellenirken bir hata oluştu.');
            throw err;
        }
    }, [userId, loadProfile]);

    const saveSocialLinks = useCallback(async (links: Omit<SocialLink, 'id' | 'userId'>[]) => {
        try {
            // Basitleştirmek için: Mevcutları silip yenileri ekliyoruz (veya id'si olanları update ediyoruz)
            // Şimdilik sadece yeni ekleme/güncelleme mantığı backend'e bağlı
            // Mevcut mock verileriyle uyumlu olması için:
            const currentLinks = await profileRepo.getSocialLinks(userId);

            // Gerçek implementation'da daha karmaşık bir diff logic gerekir
            // Ama şimdilik API'ye uygun şekilde tek tek ekleyelim
            // Önce mevcutları sil (isteğe bağlı, şimdilik repository metotlarını kullanıyoruz)
            for (const link of currentLinks) {
                await profileRepo.deleteSocialLink(link.id);
            }

            const newLinks: SocialLink[] = [];
            for (const link of links) {
                const added = await profileRepo.addSocialLink(userId, link);
                newLinks.push(added);
            }
            setSocialLinks(newLinks);
        } catch (err) {
            setError('Bağlantılar kaydedilirken bir hata oluştu.');
            throw err;
        }
    }, [userId]);

    const uploadAvatar = useCallback(async (fileUri: string) => {
        try {
            const avatarUrl = await profileRepo.uploadAvatar(userId, fileUri);
            // Burada avatarUrl'i profile update ile de göndermek gerekebilir
            await updateProfile({ avatarUrl });
            return avatarUrl;
        } catch (err) {
            setError('Profil resmi yüklenirken bir hata oluştu.');
            throw err;
        }
    }, [userId, updateProfile]);

    return {
        user,
        socialLinks,
        isLoading,
        error,
        updateProfile,
        saveSocialLinks,
        uploadAvatar,
        reload: loadProfile
    };
};
