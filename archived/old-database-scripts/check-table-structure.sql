-- ============================================
-- CHECK ACTUAL TABLE STRUCTURE
-- ============================================
-- Run this in Supabase SQL Editor to see what columns exist

-- Check vendors table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vendors'
ORDER BY ordinal_position;

-- Check owners table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'owners'
ORDER BY ordinal_position;
