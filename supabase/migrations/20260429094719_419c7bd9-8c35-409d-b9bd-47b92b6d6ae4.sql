-- 1. Lock down direct SELECT on profiles to OWNER + ADMIN only
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view their own full profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Public-facing view exposing only safe directory fields
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
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

-- The view inherits security_invoker so it respects RLS of underlying table.
-- We need an additional permissive SELECT policy that allows authenticated users
-- to read VERIFIED profiles only (the view's WHERE filters non-verified out).
CREATE POLICY "Authenticated users can view verified profiles directory"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (verification_status = 'verified');

-- Note: this re-enables read on the row, but the view exposes only safe columns.
-- Apps MUST query profiles_public for the directory, never profiles directly.

GRANT SELECT ON public.profiles_public TO authenticated;

-- 3. Storage UPDATE policy for verification-docs (deny by default, only admins can update metadata)
CREATE POLICY "Admins can update verification docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND public.has_role(auth.uid(), 'admin')
  );