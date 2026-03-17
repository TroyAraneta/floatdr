-- RLS policy snippet for EditThread owner-edit/admin-delete flow.
-- Review and run manually in your DB migration workflow.

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

-- Owners can update only their own threads.
CREATE POLICY "Owners can update their threads"
ON public.forum_threads
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Admins can delete any thread.
CREATE POLICY "Admins can delete threads"
ON public.forum_threads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Owners can upload images to bucket post-images when first folder segment is thread UUID.
CREATE POLICY "Owners can upload thread images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND EXISTS (
    SELECT 1
    FROM public.forum_threads t
    WHERE t.id = (storage.foldername(name))[1]::uuid
      AND t.author_id = auth.uid()
  )
);

-- Owners can delete their thread images.
CREATE POLICY "Owners can delete thread images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND EXISTS (
    SELECT 1
    FROM public.forum_threads t
    WHERE t.id = (storage.foldername(name))[1]::uuid
      AND t.author_id = auth.uid()
  )
);
