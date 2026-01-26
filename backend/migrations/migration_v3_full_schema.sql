-- ============================================
-- WizyClub Supabase Database Migration v3
-- Tarih: 2025-12-26
-- Açıklama: Tam veritabanı şeması ve storage bucket yapılandırması
-- ============================================

-- ============================================
-- BÖLÜM 1: MEVCUT TABLOLARIN GÜNCELLENMESİ
-- ============================================

-- 1.1 Profiles tablosuna yeni sütunlar
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shop_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS followers_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 1.2 Videos tablosuna yeni sütunlar
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS shares_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS shops_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS music_name TEXT DEFAULT 'Original Audio',
ADD COLUMN IF NOT EXISTS music_author TEXT DEFAULT 'WizyClub';

-- ============================================
-- BÖLÜM 2: YENİ TABLOLAR
-- ============================================

-- 2.1 Social Links - Sosyal Bağlantılar
CREATE TABLE IF NOT EXISTS social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('Instagram', 'TikTok', 'Youtube', 'X', 'Diger')),
    url TEXT NOT NULL,
    display_order INT2 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_links_user_id ON social_links(user_id);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Social links are publicly readable" ON social_links;
CREATE POLICY "Social links are publicly readable"
    ON social_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own links" ON social_links;
CREATE POLICY "Users can insert own links"
    ON social_links FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own links" ON social_links;
CREATE POLICY "Users can update own links"
    ON social_links FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own links" ON social_links;
CREATE POLICY "Users can delete own links"
    ON social_links FOR DELETE USING (true);

-- 2.2 User Sessions - Oturum ve Cihaz Logları
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    ip_address INET,
    device_brand TEXT,
    device_model TEXT,
    os_name TEXT,
    os_version TEXT,
    app_version TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'app_open', 'profile_update', 'video_upload')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions"
    ON user_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert sessions" ON user_sessions;
CREATE POLICY "System can insert sessions"
    ON user_sessions FOR INSERT WITH CHECK (true);

-- 2.3 Stories - Hikayeler
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INT4,
    height INT4,
    is_commercial BOOLEAN DEFAULT FALSE,
    brand_name TEXT,
    brand_url TEXT,
    commercial_type TEXT,
    likes_count INT4 DEFAULT 0,
    views_count INT4 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stories are publicly readable" ON stories;
CREATE POLICY "Stories are publicly readable"
    ON stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own stories" ON stories;
CREATE POLICY "Users can manage own stories"
    ON stories FOR ALL USING (true);

-- 2.4 Likes - Beğeniler
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT likes_one_target CHECK (
        (video_id IS NOT NULL AND story_id IS NULL) OR
        (video_id IS NULL AND story_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_video ON likes(user_id, video_id) WHERE video_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_story ON likes(user_id, story_id) WHERE story_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_story_id ON likes(story_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are publicly readable" ON likes;
CREATE POLICY "Likes are publicly readable"
    ON likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
CREATE POLICY "Users can manage own likes"
    ON likes FOR ALL USING (true);

-- 2.5 Follows - Takipler
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    following_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are publicly readable" ON follows;
CREATE POLICY "Follows are publicly readable"
    ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own follows" ON follows;
CREATE POLICY "Users can manage own follows"
    ON follows FOR ALL USING (true);

-- 2.6 Saves - Kaydedilenler
CREATE TABLE IF NOT EXISTS saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_video_id ON saves(video_id);

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saves are readable by owner" ON saves;
CREATE POLICY "Saves are readable by owner"
    ON saves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own saves" ON saves;
CREATE POLICY "Users can manage own saves"
    ON saves FOR ALL USING (true);

-- 2.7 Brands - Markalar
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands are publicly readable" ON brands;
CREATE POLICY "Brands are publicly readable"
    ON brands FOR SELECT USING (true);

-- 2.8 Brand Deals - Marka Kampanyaları
CREATE TABLE IF NOT EXISTS brand_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    payout TEXT,
    requirements JSONB,
    deadline TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_deals_brand_id ON brand_deals(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_deals_active ON brand_deals(is_active) WHERE is_active = TRUE;

ALTER TABLE brand_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active deals are publicly readable" ON brand_deals;
CREATE POLICY "Active deals are publicly readable"
    ON brand_deals FOR SELECT USING (true);

-- 2.9 Deal Participations - Kampanya Katılımları
CREATE TABLE IF NOT EXISTS deal_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES brand_deals(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    submitted_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE (deal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_participations_user ON deal_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_participations_deal ON deal_participations(deal_id);

ALTER TABLE deal_participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participations are readable" ON deal_participations;
CREATE POLICY "Participations are readable"
    ON deal_participations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create participation" ON deal_participations;
CREATE POLICY "Users can create participation"
    ON deal_participations FOR INSERT WITH CHECK (true);

-- 2.10 User Brand Collaborations - İşbirliği İstatistikleri
CREATE TABLE IF NOT EXISTS user_brand_collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
    collaboration_count INT4 DEFAULT 1,
    last_collaboration_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_brand_collab_user ON user_brand_collaborations(user_id);

ALTER TABLE user_brand_collaborations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborations are publicly readable" ON user_brand_collaborations;
CREATE POLICY "Collaborations are publicly readable"
    ON user_brand_collaborations FOR SELECT USING (true);

-- ============================================
-- BÖLÜM 3: STORAGE BUCKETS
-- ============================================

-- 3.1 Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 3.2 Thumbnails bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnails', 'thumbnails', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 3.3 Brand assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('brand_assets', 'brand_assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- 3.4 Storage Policies
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated avatar upload" ON storage.objects;
CREATE POLICY "Authenticated avatar upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "Avatar update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
CREATE POLICY "Avatar delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public thumbnail access" ON storage.objects;
CREATE POLICY "Public thumbnail access" ON storage.objects
    FOR SELECT USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Thumbnail upload" ON storage.objects;
CREATE POLICY "Thumbnail upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Public brand asset access" ON storage.objects;
CREATE POLICY "Public brand asset access" ON storage.objects
    FOR SELECT USING (bucket_id = 'brand_assets');

DROP POLICY IF EXISTS "Brand asset upload" ON storage.objects;
CREATE POLICY "Brand asset upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'brand_assets');

-- ============================================
-- BÖLÜM 4: ÖRNEK VERİLER (TEST İÇİN)
-- ============================================

-- 4.1 Örnek Markalar
INSERT INTO brands (id, name, logo_url, website_url, description, is_verified)
VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nike', 'https://logo.clearbit.com/nike.com', 'https://nike.com', 'Just Do It', true),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Adidas', 'https://logo.clearbit.com/adidas.com', 'https://adidas.com', 'Impossible is Nothing', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Puma', 'https://logo.clearbit.com/puma.com', 'https://puma.com', 'Forever Faster', true)
ON CONFLICT DO NOTHING;

-- 4.2 Örnek Brand Deal
INSERT INTO brand_deals (brand_id, title, description, payout, requirements, deadline, is_active)
VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Yaz Kampanyası 2025', 'Nike yaz koleksiyonu tanıtımı için içerik üreticileri arıyoruz.', '2500 TL', '["Min 5K takipçi", "Spor içerik üreticisi", "18+ yaş"]', '2025-03-01 23:59:59+03', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- MİGRASYON TAMAMLANDI
-- ============================================
