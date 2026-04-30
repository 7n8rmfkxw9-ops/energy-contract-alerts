-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.certification AS ENUM (
  'organic', 'fairtrade', 'rainforest_alliance', 'utz', 'demeter', 'direct_trade', 'none'
);

CREATE TYPE public.process_method AS ENUM (
  'washed', 'natural', 'honey', 'anaerobic', 'wet_hulled', 'carbonic_maceration', 'other'
);

CREATE TYPE public.lot_status AS ENUM (
  'draft', 'available', 'reserved', 'sold_out'
);

-- ============================================
-- PROFILES — colonnes additionnelles
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS altitude_m INTEGER,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS certifications public.certification[] NOT NULL DEFAULT '{}'::public.certification[],
  ADD COLUMN IF NOT EXISTS sourcing_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Étend la fonction publique de l'annuaire (pour exposer région, ville, photo, certifs, description)
DROP FUNCTION IF EXISTS public.get_directory_profiles(text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_directory_profiles(
  search_country text DEFAULT NULL,
  search_query text DEFAULT NULL,
  result_limit integer DEFAULT 50,
  result_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, first_name text, full_name text, company text,
  country text, region text, city text, altitude_m integer,
  description text, photo_url text,
  certifications public.certification[],
  website_url text, trust_level public.trust_level, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, first_name, full_name, company,
         country, region, city, altitude_m,
         description, photo_url, certifications,
         website_url, trust_level, created_at
  FROM public.profiles
  WHERE verification_status = 'verified'
    AND (search_country IS NULL OR country ILIKE search_country)
    AND (
      search_query IS NULL
      OR full_name ILIKE '%' || search_query || '%'
      OR company   ILIKE '%' || search_query || '%'
      OR region    ILIKE '%' || search_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(result_limit, 1), 100)
  OFFSET GREATEST(result_offset, 0)
$$;

DROP FUNCTION IF EXISTS public.get_directory_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_directory_profile(profile_id uuid)
RETURNS TABLE(
  id uuid, first_name text, full_name text, company text,
  country text, region text, city text, altitude_m integer,
  description text, photo_url text,
  certifications public.certification[],
  website_url text, trust_level public.trust_level, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, first_name, full_name, company,
         country, region, city, altitude_m,
         description, photo_url, certifications,
         website_url, trust_level, created_at
  FROM public.profiles
  WHERE id = profile_id AND verification_status = 'verified'
$$;

-- ============================================
-- COFFEE LOTS
-- ============================================
CREATE TABLE public.coffee_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID NOT NULL,
  name TEXT NOT NULL,
  variety TEXT,
  process public.process_method,
  humidity_pct NUMERIC(4,2),
  -- SCA
  acidity NUMERIC(3,1),
  body NUMERIC(3,1),
  sweetness NUMERIC(3,1),
  flavor_notes TEXT[] NOT NULL DEFAULT '{}'::text[],
  sca_score NUMERIC(4,1),
  -- commerce
  volume_kg NUMERIC(10,2) NOT NULL,
  price_per_kg NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status public.lot_status NOT NULL DEFAULT 'draft',
  harvest_year INTEGER,
  photo_url TEXT,
  producer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lots_humidity_range CHECK (humidity_pct IS NULL OR (humidity_pct >= 0 AND humidity_pct <= 100)),
  CONSTRAINT lots_acidity_range CHECK (acidity IS NULL OR (acidity >= 0 AND acidity <= 10)),
  CONSTRAINT lots_body_range CHECK (body IS NULL OR (body >= 0 AND body <= 10)),
  CONSTRAINT lots_sweetness_range CHECK (sweetness IS NULL OR (sweetness >= 0 AND sweetness <= 10)),
  CONSTRAINT lots_score_range CHECK (sca_score IS NULL OR (sca_score >= 0 AND sca_score <= 100)),
  CONSTRAINT lots_volume_pos CHECK (volume_kg >= 0),
  CONSTRAINT lots_price_pos CHECK (price_per_kg >= 0)
);

CREATE INDEX idx_lots_producer ON public.coffee_lots(producer_id);
CREATE INDEX idx_lots_status ON public.coffee_lots(status);
CREATE INDEX idx_lots_flavor ON public.coffee_lots USING GIN(flavor_notes);

ALTER TABLE public.coffee_lots ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_coffee_lots_updated
BEFORE UPDATE ON public.coffee_lots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction utilitaire : un lot est-il visible publiquement ?
CREATE OR REPLACE FUNCTION public.is_lot_publicly_visible(_lot_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coffee_lots l
    JOIN public.profiles p ON p.id = l.producer_id
    WHERE l.id = _lot_id
      AND l.status IN ('available','reserved')
      AND p.verification_status = 'verified'
  )
$$;

-- RLS lots
CREATE POLICY "Producers manage their own lots"
  ON public.coffee_lots FOR ALL TO authenticated
  USING (auth.uid() = producer_id AND public.has_role(auth.uid(), 'producteur'))
  WITH CHECK (auth.uid() = producer_id AND public.has_role(auth.uid(), 'producteur'));

CREATE POLICY "Authenticated users view available lots from verified producers"
  ON public.coffee_lots FOR SELECT TO authenticated
  USING (
    status IN ('available','reserved')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = producer_id AND p.verification_status = 'verified'
    )
  );

CREATE POLICY "Admins view all lots"
  ON public.coffee_lots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FAVORIS
-- ============================================
CREATE TABLE public.lot_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.coffee_lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lot_id)
);
ALTER TABLE public.lot_favorites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lot_favorites_user ON public.lot_favorites(user_id);

CREATE POLICY "Users manage their own lot favorites"
  ON public.lot_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.producer_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  producer_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, producer_id)
);
ALTER TABLE public.producer_favorites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_producer_favorites_user ON public.producer_favorites(user_id);

CREATE POLICY "Users manage their own producer favorites"
  ON public.producer_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- BUCKETS PUBLICS pour photos
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('farm-photos', 'farm-photos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lot-photos', 'lot-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read farm-photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'farm-photos');
CREATE POLICY "Owners write farm-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners update farm-photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete farm-photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read lot-photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'lot-photos');
CREATE POLICY "Owners write lot-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lot-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners update lot-photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lot-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete lot-photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lot-photos' AND auth.uid()::text = (storage.foldername(name))[1]);