-- 1. VİDEOLAR TABLOSUNU GÜNCELLE (Hata vermez)
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS hls_url TEXT, 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending', 
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- 2. STORAGE BUCKET OLUŞTUR (Varsa geçer)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hls_videos', 'hls_videos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. HLS STORAGE GÜVENLİK AYARLARI (Önce temizle, sonra oluştur)
DROP POLICY IF EXISTS "Public HLS Video Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload HLS" ON storage.objects;

-- Sadece okuma izni veriyoruz
CREATE POLICY "Public HLS Video Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'hls_videos');

-- 4. USER PREFERENCES TABLOSU VE KURALLARI
-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    preferred_quality TEXT DEFAULT 'auto',
    data_saver_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS'i aç
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 🔥 KRİTİK DÜZELTME: Eski kuralları önce siliyoruz ki hata vermesin
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;

-- Şimdi temiz bir şekilde yeniden oluşturuyoruz
CREATE POLICY "Users can view own preferences" 
ON user_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON user_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON user_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);
