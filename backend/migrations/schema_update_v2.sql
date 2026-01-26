-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY, -- Using text to match current user_id string format, or uuid if migrating
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  shop_enabled boolean DEFAULT false,
  country text,
  age integer,
  bio text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add sample profiles (matching the IDs currently in the mock system)
INSERT INTO profiles (id, username, full_name, avatar_url, country, age)
VALUES 
  ('ece_yilmaz', 'eceyilmaz', 'Ece Yılmaz', 'https://ui-avatars.com/api/?name=Ece+Yilmaz', 'Türkiye', 24),
  ('ali_kaya', 'alikaya', 'Ali Kaya', 'https://ui-avatars.com/api/?name=Ali+Kaya', 'Türkiye', 28),
  ('wizyclub-official', 'wizyclub', 'WizyClub', 'https://ui-avatars.com/api/?name=Wizy+Club', 'Türkiye', 1);

-- 3. (Optional) Convert videos.user_id to Foreign Key if needed
-- This assumes all user_ids in 'videos' exist in 'profiles'
-- ALTER TABLE videos ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (true); -- Simplified for now

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (true); -- Simplified for now
