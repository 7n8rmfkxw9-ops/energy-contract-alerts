-- Remove the SECURITY DEFINER view
DROP VIEW IF EXISTS public.profiles_public;

-- Replace with a SECURITY DEFINER function that only returns safe columns
-- and only for verified profiles. Callers cannot access unsafe columns.
CREATE OR REPLACE FUNCTION public.get_directory_profiles(
  search_country TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  result_limit INT DEFAULT 50,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  full_name TEXT,
  company TEXT,
  country TEXT,
  website_url TEXT,
  trust_level public.trust_level,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, first_name, full_name, company, country, website_url, trust_level, created_at
  FROM public.profiles
  WHERE verification_status = 'verified'
    AND (search_country IS NULL OR country ILIKE search_country)
    AND (
      search_query IS NULL
      OR full_name ILIKE '%' || search_query || '%'
      OR company   ILIKE '%' || search_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(result_limit, 1), 100)
  OFFSET GREATEST(result_offset, 0)
$$;

REVOKE EXECUTE ON FUNCTION public.get_directory_profiles(TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_directory_profiles(TEXT, TEXT, INT, INT) TO authenticated;

-- Single-profile lookup (safe fields only) for showing a public profile page
CREATE OR REPLACE FUNCTION public.get_directory_profile(profile_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  full_name TEXT,
  company TEXT,
  country TEXT,
  website_url TEXT,
  trust_level public.trust_level,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, first_name, full_name, company, country, website_url, trust_level, created_at
  FROM public.profiles
  WHERE id = profile_id AND verification_status = 'verified'
$$;

REVOKE EXECUTE ON FUNCTION public.get_directory_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_directory_profile(UUID) TO authenticated;