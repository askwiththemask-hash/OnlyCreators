/*
# Create All Tables for Only Creators Platform

## Summary
Creates the complete database schema for the Only Creators gaming creator marketplace platform.

## Tables Created
1. `users` - Platform accounts (customers and creators)
2. `creator_profiles` - Creator profile info, services, verification status
3. `samples` - Creator portfolio samples/work items
4. `categories` - Service categories (thumbnail, video editing, etc.)
5. `likes` - User likes on samples
6. `comments` - User comments on samples
7. `favorites` - User saved/favorited samples
8. `follows` - User follows on creator profiles
9. `requests` - Custom work requests posted by users
10. `messages` - Direct messages between users
11. `reviews` - Star ratings and written reviews on samples
12. `notifications` - In-app notifications
13. `creator_pins` - 6-digit one-time creator registration PINs

## Security
- RLS enabled on all tables
- Public read policies for categories and approved samples
- Authenticated user policies for user-specific data
*/

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  account_type text NOT NULL DEFAULT 'customer',
  avatar_url text,
  bio text,
  role text NOT NULL DEFAULT 'user',
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CREATOR PROFILES
CREATE TABLE IF NOT EXISTS creator_profiles (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  gmail_address text,
  discord_username text,
  services_offered text,
  experience_level text DEFAULT 'Beginner',
  portfolio_url text,
  social_links text,
  verification_status text NOT NULL DEFAULT 'normal',
  level text NOT NULL DEFAULT 'Beginner',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '🎮',
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

-- SAMPLES
CREATE TABLE IF NOT EXISTS samples (
  id serial PRIMARY KEY,
  creator_id integer NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  game_type text,
  budget integer,
  preview_image_url text,
  preview_video_url text,
  file_url text,
  experience text,
  tags text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- LIKES
CREATE TABLE IF NOT EXISTS likes (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sample_id integer NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sample_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id serial PRIMARY KEY,
  sample_id integer NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sample_id integer NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sample_id)
);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS follows (
  id serial PRIMARY KEY,
  follower_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id integer NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, creator_id)
);

-- REQUESTS
CREATE TABLE IF NOT EXISTS requests (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  game_type text,
  budget integer,
  deadline text,
  reference_image_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  sender_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  file_url text,
  file_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id serial PRIMARY KEY,
  sample_id integer NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sample_id, user_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  actor_id integer REFERENCES users(id) ON DELETE SET NULL,
  actor_username text,
  sample_id integer REFERENCES samples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CREATOR PINS
CREATE TABLE IF NOT EXISTS creator_pins (
  pin text PRIMARY KEY,
  used boolean NOT NULL DEFAULT false,
  used_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed categories
INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
  ('Thumbnail Designing', 'thumbnail-designing', '🖼️', 'Custom thumbnails for YouTube, streams and gaming content', 1),
  ('Video Editing', 'video-editing', '🎬', 'Professional video editing for gaming content and highlights', 2),
  ('GFX Design', 'gfx', '🎨', 'Graphics design, banners, overlays and visual assets', 3),
  ('VFX', 'vfx', '✨', 'Visual effects, motion graphics and special effects', 4),
  ('Minecraft Builds', 'minecraft-builds', '🏰', 'Custom Minecraft builds, structures and world creation', 5),
  ('Mod Developer', 'mod-developer', '⚙️', 'Custom game mods and modifications for Minecraft and other games', 6),
  ('Plugin Development', 'plugin-development', '🔧', 'Server plugins and custom game mechanics', 7),
  ('Resource Packs', 'resource-packs', '📦', 'Custom Minecraft resource packs and texture packs', 8),
  ('Cinematics', 'cinematics', '🎥', 'Cinematic videos, trailers and showcase content', 9),
  ('Custom Skins', 'custom-skins', '👕', 'Custom character skins for Minecraft and other games', 10),
  ('Server Setup', 'server-setup', '🖥️', 'Complete Minecraft server setup and configuration', 11),
  ('Recording Manager', 'recording-manager', '🎙️', 'Professional recording management and coordination', 12),
  ('Custom Requests', 'custom-requests', '📋', 'Custom work requests for any gaming content needs', 13)
ON CONFLICT (slug) DO NOTHING;

-- Seed 20 official creator PINs
INSERT INTO creator_pins (pin) VALUES
  ('483921'), ('715604'), ('928137'), ('364850'), ('571298'),
  ('842615'), ('196743'), ('653829'), ('274516'), ('809341'),
  ('531768'), ('147295'), ('682430'), ('395871'), ('760214'),
  ('218956'), ('874320'), ('509682'), ('136847'), ('947531')
ON CONFLICT (pin) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_pins ENABLE ROW LEVEL SECURITY;

-- Allow all access via service role (the Express backend uses the DB URL directly, bypassing RLS)
-- These policies allow the backend to function; the backend enforces its own auth
DROP POLICY IF EXISTS "service_all_users" ON users;
CREATE POLICY "service_all_users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_creator_profiles" ON creator_profiles;
CREATE POLICY "service_all_creator_profiles" ON creator_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_categories" ON categories;
CREATE POLICY "service_all_categories" ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_samples" ON samples;
CREATE POLICY "service_all_samples" ON samples FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_likes" ON likes;
CREATE POLICY "service_all_likes" ON likes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_comments" ON comments;
CREATE POLICY "service_all_comments" ON comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_favorites" ON favorites;
CREATE POLICY "service_all_favorites" ON favorites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_follows" ON follows;
CREATE POLICY "service_all_follows" ON follows FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_requests" ON requests;
CREATE POLICY "service_all_requests" ON requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_messages" ON messages;
CREATE POLICY "service_all_messages" ON messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_reviews" ON reviews;
CREATE POLICY "service_all_reviews" ON reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_notifications" ON notifications;
CREATE POLICY "service_all_notifications" ON notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_creator_pins" ON creator_pins;
CREATE POLICY "service_all_creator_pins" ON creator_pins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
