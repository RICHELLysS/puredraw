-- 确保 bucket 存在
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('puredraw_images', 'puredraw_images', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 1048576;

-- 存储策略
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'puredraw_images');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'puredraw_images');

DROP POLICY IF EXISTS "Users can update their own objects" ON storage.objects;
CREATE POLICY "Users can update their own objects" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Owners can delete" ON storage.objects;
CREATE POLICY "Owners can delete" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);
