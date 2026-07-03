-- Add auto_delete_at column to posts for smart delete auto-cleanup
-- When set, the post will be automatically deleted from the app after this timestamp

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'auto_delete_at'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN auto_delete_at timestamptz;
  END IF;
END $$;
