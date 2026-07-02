-- Offres marché importées automatiquement (VREG V-test, open data
-- officielle — voir scripts/import-market-offers.ts). Table partagée,
-- lecture publique : ce n'est pas une donnée par utilisateur comme
-- `contracts`, donc pas de RLS scopée par user_id. Seule la service_role
-- (utilisée par le job d'import) peut écrire.

create table if not exists market_offers (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  offer_name text not null,
  contract_type text not null
    check (contract_type in ('fixed', 'variable', 'dynamic')),

  price_elec_kwh_day numeric(10, 5) not null,
  price_elec_kwh_night numeric(10, 5),
  price_gas_kwh numeric(10, 5) not null,

  fixed_fee_elec_annual numeric(10, 2) not null default 0,
  fixed_fee_gas_annual numeric(10, 2) not null default 0,

  commitment_months integer not null default 0,
  source_url text,
  tariff_updated_at date not null default current_date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- une ligne par offre marché ; le job d'import fait un upsert dessus
  unique (provider, offer_name)
);

alter table market_offers enable row level security;

create policy "market_offers_read_all" on market_offers
  for select using (true);
