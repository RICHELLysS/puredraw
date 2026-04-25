-- Enum types
CREATE TYPE public.user_role AS ENUM ('artist', 'client', 'admin');
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE public.commission_status AS ENUM (
  'pending_agreement', -- 协商中
  'agreed',           -- 协商达成，等待支付定金
  'deposit_paid',     -- 已付定金，进行中
  'sketch_uploaded',  -- 草图已上传，待确认
  'final_uploaded',   -- 成图已上传，待确认
  'completed',        -- 订单完成
  'reported',         -- 被举报 AI
  'refunded'          -- 已退款
);
CREATE TYPE public.artwork_type AS ENUM ('digital', 'handdrawn');

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'client',
  verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  verification_feedback text,
  bio text,
  style_preference public.artwork_type,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Artworks table (Showcase & Verification)
CREATE TABLE public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  type public.artwork_type NOT NULL DEFAULT 'digital',
  is_for_verification boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Commissions table
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  sketch_deadline timestamptz,
  final_deadline timestamptz NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 70),
  deposit numeric(10,2) NOT NULL DEFAULT 30,
  status public.commission_status NOT NULL DEFAULT 'pending_agreement',
  sketch_url text,
  final_url text,
  wechat_pay_url text, -- 支付链接记录
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  commission_id uuid REFERENCES public.commissions(id) ON DELETE SET NULL, -- 消息关联约稿需求
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Reports table (AI Report)
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Community Posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_urls text[],
  created_at timestamptz DEFAULT now()
);

-- Community Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Functions & Helpers
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role = 'admin'::public.user_role
  );
$$;

-- Trigger for syncing users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  username_val text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  -- Extract username from email (e.g., user@miaoda.com -> user)
  username_val := split_part(NEW.email, '@', 1);
  
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    username_val,
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'client'::public.user_role END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Policies (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins have full access" ON public.profiles FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artworks are viewable by everyone" ON public.artworks FOR SELECT USING (true);
CREATE POLICY "Artists can manage their own artworks" ON public.artworks FOR ALL USING (auth.uid() = artist_id);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own commissions" ON public.commissions FOR SELECT USING (auth.uid() = client_id OR auth.uid() = artist_id);
CREATE POLICY "Users can create commissions" ON public.commissions FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update their own commissions" ON public.commissions FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = artist_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR is_admin(auth.uid()));
CREATE POLICY "Clients can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can manage their own posts" ON public.posts FOR ALL USING (auth.uid() = author_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comments" ON public.comments FOR ALL USING (auth.uid() = author_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commissions;

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('puredraw_images', 'puredraw_images', true);
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'puredraw_images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'puredraw_images');
CREATE POLICY "Owners can delete" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);
