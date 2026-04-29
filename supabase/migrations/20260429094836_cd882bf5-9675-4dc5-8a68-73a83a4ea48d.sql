-- Defense in depth: revoke UPDATE privilege on admin-only columns at the role level.
-- Even before RLS evaluates, Postgres will reject writes to these columns from `authenticated`.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  first_name,
  full_name,
  company,
  country,
  legal_name,
  vat_number,
  vat_country_code,
  website_url
) ON public.profiles TO authenticated;

-- INSERT / SELECT / DELETE privileges are already governed by RLS — no change needed.