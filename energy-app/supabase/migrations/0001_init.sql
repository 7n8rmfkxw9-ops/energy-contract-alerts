-- Energy Contract Alerts — schéma initial
-- Usage strictement mono-utilisateur (RLS scopée par auth.uid()),
-- mais on garde user_id partout pour rester compatible multi-user plus tard
-- sans migration de schéma.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. INGESTION CONSOMMATION
-- ---------------------------------------------------------------------

-- Un "import" = un fichier CSV Fluvius uploadé (ou, plus tard, une session
-- de sync d'un boîtier P1). On garde une trace de chaque batch pour
-- l'affichage "dernier import il y a X jours" et pour le debug.
create table if not exists csv_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'fluvius_csv'
    check (source in ('fluvius_csv', 'p1_realtime')),
  energy_type text not null
    check (energy_type in ('electricity', 'gas')),
  filename text not null,
  row_count integer not null default 0,
  period_start timestamptz,
  period_end timestamptz,
  imported_at timestamptz not null default now()
);

create index if not exists csv_imports_user_idx on csv_imports (user_id, imported_at desc);

-- Relevés quart-horaires. Table unique pour toutes les sources
-- (import CSV aujourd'hui, boîtier P1 temps réel demain) : seule la colonne
-- `source` / `import_id` change selon l'origine de la donnée.
create table if not exists consumption_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  energy_type text not null
    check (energy_type in ('electricity', 'gas')),
  reading_at timestamptz not null,
  value_kwh numeric(10, 4) not null check (value_kwh >= 0),
  source text not null default 'fluvius_csv'
    check (source in ('fluvius_csv', 'p1_realtime')),
  import_id uuid references csv_imports(id) on delete set null,
  created_at timestamptz not null default now(),
  -- une seule valeur par utilisateur / type d'énergie / créneau / source,
  -- pour pouvoir ré-importer un CSV qui chevauche une période déjà connue
  -- sans dupliquer les lignes (upsert idempotent).
  unique (user_id, energy_type, reading_at, source)
);

create index if not exists consumption_readings_user_time_idx
  on consumption_readings (user_id, energy_type, reading_at);

-- ---------------------------------------------------------------------
-- 2. BASE DE TARIFS (saisie manuelle)
-- ---------------------------------------------------------------------

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  offer_name text not null,
  contract_type text not null
    check (contract_type in ('fixed', 'variable', 'dynamic')),

  -- électricité : prix au kWh selon créneau. Le simple tarif jour couvre
  -- le cas mono-horaire ; nuit / nuit-exclusive sont nullable pour les
  -- offres bi-horaires ou exclusives nuit (courantes en Belgique).
  price_elec_kwh_day numeric(10, 5) not null,
  price_elec_kwh_night numeric(10, 5),
  price_elec_kwh_exclusive_night numeric(10, 5),

  price_gas_kwh numeric(10, 5) not null,

  fixed_fee_elec_annual numeric(10, 2) not null default 0,
  fixed_fee_gas_annual numeric(10, 2) not null default 0,

  commitment_months integer not null default 0,
  source_url text,
  tariff_updated_at date not null default current_date,

  -- marque le contrat actuellement souscrit par l'utilisateur ; sert de
  -- référence pour le calcul de l'écart en euros/an dans le comparateur.
  is_current_contract boolean not null default false,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_user_idx on contracts (user_id);

-- un seul contrat "actuel" par utilisateur
create unique index if not exists contracts_one_current_per_user
  on contracts (user_id)
  where is_current_contract;

-- ---------------------------------------------------------------------
-- 3. MOTEUR DE COMPARAISON (résultats mis en cache)
-- ---------------------------------------------------------------------

-- Le coût peut être recalculé à la volée, mais on garde un historique des
-- simulations pour l'affichage du dashboard et pour la traçabilité des
-- alertes envoyées (quelle simulation a déclenché quelle alerte).
create table if not exists contract_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  import_id uuid references csv_imports(id) on delete set null,
  annual_cost_estimate numeric(10, 2) not null,
  vs_current_diff_eur numeric(10, 2),
  simulated_at timestamptz not null default now()
);

create index if not exists contract_simulations_user_idx
  on contract_simulations (user_id, simulated_at desc);

-- ---------------------------------------------------------------------
-- 4. ALERTES
-- ---------------------------------------------------------------------

create table if not exists alert_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  threshold_eur_per_year numeric(10, 2) not null default 100,
  notify_email text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  simulation_id uuid references contract_simulations(id) on delete set null,
  threshold_eur numeric(10, 2) not null,
  savings_eur numeric(10, 2) not null,
  channel text not null default 'email' check (channel in ('email')),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  -- lien de souscription + résumé chiffré envoyés à l'utilisateur ;
  -- jamais d'action de souscription automatique déclenchée par l'app.
  message text,
  sent_at timestamptz not null default now()
);

create index if not exists alerts_user_idx on alerts (user_id, sent_at desc);

-- ---------------------------------------------------------------------
-- RLS — mono-utilisateur, chacun ne voit que ses propres données
-- ---------------------------------------------------------------------

alter table csv_imports enable row level security;
alter table consumption_readings enable row level security;
alter table contracts enable row level security;
alter table contract_simulations enable row level security;
alter table alert_settings enable row level security;
alter table alerts enable row level security;

create policy "csv_imports_owner" on csv_imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "consumption_readings_owner" on consumption_readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contracts_owner" on contracts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contract_simulations_owner" on contract_simulations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "alert_settings_owner" on alert_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "alerts_owner" on alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
