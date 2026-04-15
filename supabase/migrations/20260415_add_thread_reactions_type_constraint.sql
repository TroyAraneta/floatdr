-- Add CHECK constraint to thread_reactions.type to match reply_reactions
-- This ensures only 'like' or 'dislike' values are allowed

ALTER TABLE public.thread_reactions
DROP CONSTRAINT IF EXISTS thread_reactions_type_check;

ALTER TABLE public.thread_reactions
ADD CONSTRAINT thread_reactions_type_check 
CHECK (type = ANY (ARRAY['like'::text, 'dislike'::text]));







