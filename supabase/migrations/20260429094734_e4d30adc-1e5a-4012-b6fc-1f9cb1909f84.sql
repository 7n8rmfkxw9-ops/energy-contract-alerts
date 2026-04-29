-- Remove the permissive directory policy on profiles (it would expose all columns)
DROP POLICY IF EXISTS "Authenticated users can view verified profiles directory" ON public.profiles;

-- Recreate the public view as SECURITY DEFINER (owned by postgres) so it
-- bypasses RLS on profiles and exposes ONLY the whitelisted columns.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  id,
  first_name,
  full_name,
  company,
  country,
  website_url,
  verification_status,
  trust_level,
  created_at
FROM public.profiles
WHERE verification_status = 'verified';

-- Restrict execute: only authenticated users can read the directory
REVOKE ALL ON public.profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_public TO authenticated;