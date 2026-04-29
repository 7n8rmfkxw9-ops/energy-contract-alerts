-- Verification status enums
CREATE TYPE public.verification_status AS ENUM ('pending', 'in_review', 'verified', 'rejected');
CREATE TYPE public.trust_level AS ENUM ('none', 'bronze', 'silver', 'gold');
CREATE TYPE public.document_type AS ENUM ('business_registration', 'vat_certificate', 'organic_certification', 'fairtrade_certification', 'farm_photo', 'shop_photo', 'id_document', 'other');

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN trust_level public.trust_level NOT NULL DEFAULT 'none',
  ADD COLUMN legal_name TEXT,
  ADD COLUMN vat_number TEXT,
  ADD COLUMN vat_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN vat_verified_at TIMESTAMPTZ,
  ADD COLUMN vat_country_code TEXT,
  ADD COLUMN website_url TEXT,
  ADD COLUMN admin_notes TEXT,
  ADD COLUMN reviewed_by UUID,
  ADD COLUMN reviewed_at TIMESTAMPTZ;

-- Verification documents
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.document_type NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.verification_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents"
  ON public.verification_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own documents"
  ON public.verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own documents"
  ON public.verification_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update documents"
  ON public.verification_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Verification audit log (immutable)
CREATE TABLE public.verification_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_status public.verification_status,
  new_status public.verification_status,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.verification_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.verification_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- Restrictive defense: never allow updates/deletes on audit log
CREATE POLICY "Audit log is append-only"
  ON public.verification_audit_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Re-allow SELECT and INSERT explicitly via permissive policies above by adding restrictive only for UPDATE/DELETE
DROP POLICY "Audit log is append-only" ON public.verification_audit_log;
CREATE POLICY "No updates on audit log"
  ON public.verification_audit_log
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false);
CREATE POLICY "No deletes on audit log"
  ON public.verification_audit_log
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- CRITICAL: prevent users from self-promoting to verified status
-- Replace the profile update policy to forbid editing protected columns
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (safe fields)"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to lock down protected fields (only admins can change them)
CREATE OR REPLACE FUNCTION public.guard_profile_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the actor is not an admin, forbid changing protected fields
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.trust_level IS DISTINCT FROM OLD.trust_level
       OR NEW.vat_verified IS DISTINCT FROM OLD.vat_verified
       OR NEW.vat_verified_at IS DISTINCT FROM OLD.vat_verified_at
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Cannot modify protected verification fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_protected_fields() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_guard_protected_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_fields();

-- Storage bucket for verification documents (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files in their own folder (named after their user id)
CREATE POLICY "Users can read their own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can read all verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can upload to their own verification folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own verification docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Index for admin dashboard performance
CREATE INDEX idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX idx_verification_documents_user_id ON public.verification_documents(user_id);
CREATE INDEX idx_verification_documents_status ON public.verification_documents(status);