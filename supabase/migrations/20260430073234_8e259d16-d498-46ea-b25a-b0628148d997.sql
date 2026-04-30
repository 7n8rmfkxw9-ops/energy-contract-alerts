-- 1) Empêcher le listing des buckets publics : on garde la lecture par chemin
DROP POLICY IF EXISTS "Public read farm-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read lot-photos" ON storage.objects;

CREATE POLICY "Read farm-photos by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'farm-photos' AND name IS NOT NULL);

CREATE POLICY "Read lot-photos by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lot-photos' AND name IS NOT NULL);

-- 2) Restreindre l'exécution des SECURITY DEFINER aux utilisateurs connectés
REVOKE EXECUTE ON FUNCTION public.get_directory_profiles(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_directory_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_lot_publicly_visible(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_directory_profiles(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_directory_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lot_publicly_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;