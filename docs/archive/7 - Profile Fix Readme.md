# Profil Sayfası Supabase Entegrasyonu Düzeltmesi

## Sorun
Profil sayfası Supabase'den veri almıyordu çünkü:
1. ✅ Hardcode edilmiş kullanıcı ID'si kullanılıyordu
2. ✅ Auth sistemi yoktu - gerçek oturum açmış kullanıcıyı alma yöntemi yoktu
3. ✅ Her zaman fallback (mock) veriler gösteriliyordu

## Yapılan Değişiklikler

### 1. Auth Store Oluşturuldu
**Dosya:** `mobile/src/presentation/store/useAuthStore.ts`

Supabase authentication state'ini yöneten Zustand store:
- Kullanıcı oturumunu kontrol eder
- Auth state değişikliklerini dinler
- Sign out fonksiyonu sağlar

### 2. Profil Sayfası Güncellendi
**Dosya:** `mobile/app/(tabs)/profile.tsx`

Değişiklikler:
- `useAuthStore` import edildi
- Auth state initialize edildi
- Gerçek kullanıcı ID'si kullanılıyor: `authUser?.id || fallback`
- Debug log'ları eklendi
- Fallback veriler sadece profil yüklenemediğinde gösteriliyor

### 3. Debug Logging Eklendi
**Dosya:** `mobile/src/presentation/hooks/useProfile.ts`

Profile loading sürecini izlemek için console log'ları eklendi.

## Test ve Kullanım

### Senaryo 1: Kullanıcı Oturum Açmış
1. Supabase auth ile giriş yapılırsa
2. `authUser.id` kullanılır
3. O ID ile Supabase'den profil çekilir
4. Gerçek profil verileri gösterilir

### Senaryo 2: Kullanıcı Oturum Açmamış
1. `authUser` null olur
2. Fallback ID kullanılır: `687c8079-e94c-42c2-9442-8a4a6b63dec6`
3. Eğer bu ID ile profil varsa, o gösterilir
4. Yoksa, minimal fallback veriler gösterilir

### Test Profili Oluşturma

Backend klasöründe `create_test_profile.sql` dosyası oluşturuldu.

**Kullanım:**
1. Supabase Dashboard'a gidin
2. SQL Editor'ü açın
3. `create_test_profile.sql` içeriğini yapıştırın
4. Çalıştırın

Bu script:
- Test kullanıcısı için profil oluşturur
- Örnek sosyal medya linkleri ekler
- Eğer profil zaten varsa hata vermez

### Debug Loglarını Kontrol Etme

Uygulamayı çalıştırdığınızda console'da şunları göreceksiniz:

```
[Profile] Auth user: <user-id or undefined>
[Profile] Current user ID: <user-id or fallback-id>
[useProfile] Loading profile for user ID: <user-id>
[useProfile] Profile data loaded: <profile-object or null>
[useProfile] Social links loaded: <links-array>
```

Bu loglar sayesinde:
- Auth state'in doğru çalışıp çalışmadığını
- Hangi user ID'nin kullanıldığını
- Supabase'den veri gelip gelmediğini
görebilirsiniz.

## Sonraki Adımlar

### Login Sistemi Eklemek (Önerilen)
Şu an için auth store var ama login ekranı yok. Tam çalışması için:

1. Login/Signup ekranları oluşturun
2. Supabase auth ile e-posta/şifre girişi yapın
3. Auth state otomatik güncellenecek
4. Profil sayfası gerçek kullanıcı verisini gösterecek

### Örnek Login Kodu
```typescript
import { supabase } from '../core/supabase';

async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  // Auth store otomatik güncellenecek
  return data;
}
```

## Sorun Giderme

### "Profile data loaded: null" görüyorsanız:
1. Supabase'de o ID ile profil var mı kontrol edin
2. `create_test_profile.sql` script'ini çalıştırın
3. Supabase bağlantı bilgilerini kontrol edin

### "Auth user: undefined" görüyorsanız:
1. Kullanıcı oturum açmamış demektir
2. Fallback ID kullanılacak
3. Login sistemi ekleyerek çözebilirsiniz

### Profil güncellenmiyor:
1. Console log'ları kontrol edin
2. Supabase profiles tablosunu kontrol edin
3. RLS (Row Level Security) politikalarını kontrol edin
