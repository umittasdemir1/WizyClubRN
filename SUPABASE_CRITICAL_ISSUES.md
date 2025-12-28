# 🚨 WizyClub - Kritik Supabase Sorunları ve Eksiklikler

## ⚠️ SEVİYE 1: KRİTİK (Hemen Düzeltilmeli)

### 1. ❌ AUTH TRIGGER EKSİK - En Büyük Sorun!

**Sorun:**
- Supabase Auth ile `profiles` tablosu arasında bağlantı yok
- Yeni kullanıcı kaydolunca otomatik profil oluşturulmuyor
- Manuel profil oluşturma gerekiyor

**Sonuç:**
- Kullanıcı sign up yapıyor → Auth.users'a kayıt oluyor
- AMA profiles tablosunda kayıt yok → App crash!
- Şu an profil sayfası çalışıyor çünkü manuel oluşturulmuş

**Çözüm:**
```sql
-- Auth trigger - MUTLAKA EKLE!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger bağla
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 2. ❌ COUNTER GÜNCELLEME TRİGGER'LARI YOK

**Sorun:**
- `likes_count`, `followers_count`, `saves_count` manuel güncelleniyor
- Increment/decrement trigger'ları yok
- Tutarsızlık riski!

**Örnek:**
```typescript
// Şu an kod böyle:
await supabase.from('likes').insert({...}); // ✅ Like ekleniyor
// AMA likes_count güncellenmiyor! ❌
```

**Çözüm:**
```sql
-- Like eklenince/silinince counter'ı otomatik güncelle
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

-- Aynısı followers, saves için de gerekli!
```

---

### 3. 🔓 RLS POLICY'LER ÇOK GEVŞEK - Güvenlik Riski!

**Sorun:**
```sql
-- ŞU AN BÖYLE (YANLIŞ!):
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (true); -- ❌ Herkes her profili güncelleyebilir!

CREATE POLICY "Users can delete own links"
ON social_links FOR DELETE USING (true); -- ❌ Herkes her link'i silebilir!
```

**Sonuç:**
- Kullanıcı A, Kullanıcı B'nin profilini değiştirebilir
- Güvenlik açığı!

**Çözüm:**
```sql
-- DOĞRU ŞEKILDE:
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid()::text = id); -- ✅ Sadece kendi profili

CREATE POLICY "Users can manage own links"
ON social_links FOR ALL
USING (auth.uid()::text = user_id); -- ✅ Sadece kendi linkleri

-- Tüm policy'leri gözden geçir!
```

---

### 4. ❌ İSTATİSTİKLER GERÇEK ZAMANLI DEĞİL

**Sorun:**
- Like attın → Counter hemen güncellenmiyor
- Follow yaptın → Follower count artmıyor
- Client-side optimistic update var ama DB'de değil

**Çözüm:**
- Trigger'lar ekle (yukarıda)
- Ya da Supabase Realtime Subscriptions kullan

---

## ⚡ SEVİYE 2: PERFORMANS SORUNLARI

### 5. 📊 EKSİK INDEX'LER

**Mevcut indexler:** ✅
```sql
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_user_id ON videos(user_id);
```

**Eksik olanlar:** ❌
```sql
-- Like/save sorgularında performans sorunu olabilir
CREATE INDEX idx_likes_user_video ON likes(user_id, video_id) WHERE video_id IS NOT NULL;
CREATE INDEX idx_saves_user_video ON saves(user_id, video_id);

-- Follow sorgularında yavaşlık
CREATE INDEX idx_follows_composite ON follows(follower_id, following_id);

-- Soft delete sorgularında
CREATE INDEX idx_videos_not_deleted ON videos(created_at DESC) WHERE deleted_at IS NULL;
```

---

### 6. ⚠️ N+1 QUERY RİSKİ (Kısmen çözülmüş)

**İYİ TARAF:** ✅
```typescript
.select('*, profiles(*)') // Join ile tek sorguda çekiyor
```

**SORUN:** ❌
- Her video için `isLiked`, `isSaved` state'i yok
- Client-side local state ile hallediliyor
- Ama gerçek durumu almak için ayrı query gerekir

**Çözüm:**
```sql
-- Supabase RPC fonksiyonu oluştur
CREATE OR REPLACE FUNCTION get_videos_with_user_interactions(
  p_user_id TEXT,
  p_limit INT,
  p_offset INT
)
RETURNS TABLE (
  -- video fields...
  is_liked BOOLEAN,
  is_saved BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.*,
    EXISTS(SELECT 1 FROM likes WHERE user_id = p_user_id AND video_id = v.id) as is_liked,
    EXISTS(SELECT 1 FROM saves WHERE user_id = p_user_id AND video_id = v.id) as is_saved
  FROM videos v
  WHERE v.deleted_at IS NULL
  ORDER BY v.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

---

### 7. 🗑️ SOFT DELETE TUTARSIZLIĞI

**Sorun:**
```typescript
// Bazı sorgularda kontrol var:
.is('deleted_at', null) // ✅

// Bazılarında yok:
.from('profiles').select('*') // ❌ Silinmiş profiller de gelir
```

**Çözüm:**
- Supabase View oluştur (otomatik filtreler):
```sql
CREATE VIEW active_videos AS
SELECT * FROM videos WHERE deleted_at IS NULL;

-- Artık şunu kullan:
.from('active_videos')
```

---

## 🔧 SEVİYE 3: ARCHITECTURE & BEST PRACTICES

### 8. 🎭 HARDCODED USER_MAP

**Kod:**
```typescript
const USER_MAP: Record<string, { displayName: string; avatar: string }> = {
    'ece_yilmaz': { displayName: 'Ece Yılmaz', ... },
    // 20+ kullanıcı hardcode!
};
```

**Sorun:**
- Profil yoksa fallback kullanıyor
- Production'da yanlış veri gösterir

**Çözüm:**
- Tüm videoların user_id'si profiles'da olmalı
- Orphan data temizle
- Fallback sadece error durumunda

---

### 9. 🌐 STORAGE KARMAŞASI

**Durum:**
- Migration'da Supabase Storage bucket'ları oluşturuluyor
- Ama kod Cloudflare R2 kullanıyor
- Avatar upload: Backend API'ye gidiyor (R2'ye yüklüyor)

**Sorun:**
- İki storage sistemi var
- Karmaşık, bakımı zor

**Öneriler:**
1. Sadece R2 kullan (video için mantıklı, büyük dosyalar)
2. Avatar/thumbnail için Supabase Storage kullan (küçük dosyalar)
3. Migration'daki bucket kodlarını kaldır veya kullan

---

### 10. 🔔 REAL-TIME SUBSCRIPTIONS YOK

**Eksik:**
- Like notification gerçek zamanlı değil
- Follow notification yok
- Comment notification yok (comments tablosu bile yok!)

**Sosyal medya için kritik!**

**Çözüm:**
```typescript
// Supabase Realtime kullan
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'likes' },
    (payload) => {
      // Push notification gönder
    }
  )
  .subscribe();
```

---

### 11. 📝 COMMENTS SİSTEMİ YOK

**Sorun:**
- `commentsCount` property var ama `comments` tablosu yok!
- UI'da comment icon var ama çalışmıyor

**Çözüm:**
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  likes_count INT4 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- + Counter trigger ekle
```

---

### 12. 🔐 AUTH FLOW EKSİK

**Kod tarafında:**
- `useAuthStore` oluşturduk ✅
- Ama Login/Signup ekranı yok ❌
- Email verification yok ❌
- Password reset yok ❌

**Backend'de:**
- Email templates yok
- Auth hooks yok

---

## 📋 ÖNCELİK SIRASI (Ne Yapmalısın?)

### 🔴 HEMEN ŞİMDİ (1-2 Gün):
1. ✅ Auth trigger ekle (user kaydolunca profil oluşsun)
2. ✅ Counter trigger'ları ekle (likes, follows, saves)
3. ✅ RLS policy'leri düzelt (güvenlik!)

### 🟡 BU HAFTA:
4. ✅ Eksik indexleri ekle
5. ✅ Soft delete view oluştur
6. ✅ Comments tablosu oluştur

### 🟢 ÖNÜMÜZDEKI SPRINT:
7. ✅ Real-time notifications
8. ✅ Login/Signup UI
9. ✅ Storage stratejisini netleştir
10. ✅ Hardcoded data'yı temizle

---

## 🎯 SONUÇ

**Projen şu an çalışıyor ama:**
- ❌ Auth akışı tam değil
- ❌ Counter'lar manuel (tutarsızlık riski)
- ❌ Güvenlik zayıf (RLS policy'ler gevşek)
- ❌ Performans optimize edilmemiş (eksik indexler)
- ❌ Sosyal medya kritik özellikleri eksik (notifications, comments)

**İyi taraflar:**
- ✅ Clean Architecture
- ✅ N+1 query sorunu yok (join kullanılıyor)
- ✅ Soft delete var
- ✅ Migration yapısı düzenli

**Önce ne yapmalısın?**
→ Auth trigger ve counter trigger'ları ekle, RLS'i düzelt. Bunlar olmadan production'a çıkma!
