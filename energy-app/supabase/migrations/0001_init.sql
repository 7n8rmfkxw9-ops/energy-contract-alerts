-- Energy Contract Alerts — schéma initial (compteur analogique)
--
-- La consommation n'est PAS mesurée en continu : l'utilisateur relève
-- lui-même les index de son compteur à intervalle irrégulier. La conso
-- d'une période = différence entre deux relevés consécutifs ; le coût
-- annuel est ensuite extrapolé à partir des périodes couvertes.
--
-- Usage strictement mono-utilisateur (RLS scopée par auth.uid()), mais on
-- garde user_id partout pour rester compatible multi-user plus tard sans
-- migration de schéma.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. RELEVÉS D'INDEX
-- ---------------------------------------------------------------------

create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,

  -- index électricité en kWh. Compteur mono-horaire : seul elec_day_index
  -- est rempli. Compteur bi-horaire : day + night.
  elec_day_index numeric(12, 3) check (elec_day_index >= 0),
  elec_night_index numeric(12, 3) check (elec_night_index >= 0),

  -- index gaz en m³ (converti en kWh au moment du calcul, via le
  -- coefficient configurable dans user_settings)
  gas_index_m3 numeric(12, 3) check (gas_index_m3 >= 0),

  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- un relevé par jour maximum ; l'édition corrige le relevé existant
  unique (user_id, reading_date),
  -- un relevé vide n'a pas de sens
  check (elec_day_index is not null or gas_index_m3 is not null)
);

create index if not exists meter_readings_user_date_idx
  on meter_readings (user_id, reading_date);

-- ---------------------------------------------------------------------
-- 2. BASE DE TARIFS (saisie manuelle, pas de scraping)
-- ---------------------------------------------------------------------

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  offer_name text not null,
  contract_type text not null
    check (contract_type in ('fixed', 'variable', 'dynamic')),

  -- prix €/kWh. price_elec_kwh_night nullable : offres mono-horaires.
  price_elec_kwh_day numeric(10, 5) not null,
  price_elec_kwh_night numeric(10, 5),
  price_gas_kwh numeric(10, 5) not null,

  fixed_fee_elec_annual numeric(10, 2) not null default 0,
  fixed_fee_gas_annual numeric(10, 2) not null default 0,

  commitment_months integer not null default 0,
  source_url text,
  tariff_updated_at date not null default current_date,

  -- contrat actuellement souscrit : référence pour l'écart en €/an.
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
-- 3. SIMULATIONS (résultats mis en cache pour dashboard + traçabilité)
-- ---------------------------------------------------------------------

create table if not exists contract_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  annual_cost_estimate numeric(10, 2) not null,
  vs_current_diff_eur numeric(10, 2),
  -- période de relevés sur laquelle la conso a été extrapolée
  period_start date,
  period_end date,
  simulated_at timestamptz not null default now()
);

create index if not exists contract_simulations_user_idx
  on contract_simulations (user_id, simulated_at desc);

-- ---------------------------------------------------------------------
-- 4. PRÉFÉRENCES + ALERTES
-- ---------------------------------------------------------------------

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- alerte si économie potentielle >= seuil (€/an)
  threshold_eur_per_year numeric(10, 2) not null default 100,
  notify_email text,
  alerts_enabled boolean not null default true,

  -- rappel "dernier relevé il y a X jours" sur le dashboard
  reading_reminder_days integer not null default 30,

  -- coefficient de conversion gaz m³ -> kWh. ~11,5 pour le gaz riche (H)
  -- désormais distribué partout en Flandre ; ajustable car il varie
  -- légèrement selon la zone (voir facture ou fluvius.be).
  gas_kwh_per_m3 numeric(6, 3) not null default 11.5,

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
  -- contenu envoyé : lien vers la page du fournisseur + résumé chiffré.
  -- Jamais d'action de souscription automatique déclenchée par l'app.
  message text,
  sent_at timestamptz not null default now()
);

create index if not exists alerts_user_idx on alerts (user_id, sent_at desc);

-- ---------------------------------------------------------------------
-- RLS — chacun ne voit que ses propres données
-- ---------------------------------------------------------------------

alter table meter_readings enable row level security;
alter table contracts enable row level security;
alter table contract_simulations enable row level security;
alter table user_settings enable row level security;
alter table alerts enable row level security;

create policy "meter_readings_owner" on meter_readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contracts_owner" on contracts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contract_simulations_owner" on contract_simulations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_settings_owner" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "alerts_owner" on alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
