-- Create a test profile for the hardcoded user ID
-- Run this in Supabase SQL Editor if the profile doesn't exist

-- First, check if the profile exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = '687c8079-e94c-42c2-9442-8a4a6b63dec6'
    ) THEN
        -- Insert the test profile
        INSERT INTO profiles (
            id,
            username,
            full_name,
            bio,
            avatar_url,
            country,
            age,
            website,
            is_verified,
            followers_count,
            following_count,
            posts_count,
            created_at,
            updated_at
        ) VALUES (
            '687c8079-e94c-42c2-9442-8a4a6b63dec6',
            'umittasdemir',
            'Umit Tasdemir',
            'Mobile developer passionate about React Native and modern UI/UX. Building WizyClub to connect creators with brands.',
            'https://i.pravatar.cc/300?img=12',
            'TR',
            28,
            'https://wizyclub.com',
            true,
            1200,
            450,
            89,
            now(),
            now()
        );

        -- Add some sample social links
        INSERT INTO social_links (user_id, platform, url, display_order)
        VALUES
            ('687c8079-e94c-42c2-9442-8a4a6b63dec6', 'twitter', 'https://twitter.com/umittasdemir', 0),
            ('687c8079-e94c-42c2-9442-8a4a6b63dec6', 'instagram', 'https://instagram.com/umittasdemir', 1),
            ('687c8079-e94c-42c2-9442-8a4a6b63dec6', 'github', 'https://github.com/umittasdemir', 2);

        RAISE NOTICE 'Test profile created successfully!';
    ELSE
        RAISE NOTICE 'Profile already exists';
    END IF;
END $$;

-- Verify the profile was created
SELECT
    id,
    username,
    full_name,
    bio,
    is_verified,
    followers_count,
    following_count,
    posts_count
FROM profiles
WHERE id = '687c8079-e94c-42c2-9442-8a4a6b63dec6';
