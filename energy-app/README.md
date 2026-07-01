# Energy Contract Alerts

Web app personnelle (mono-utilisateur) pour suivre sa consommation
d'électricité et de gaz en Belgique avec un **compteur analogique**, et
être alerté quand un contrat moins cher que le sien apparaît dans la base
de tarifs saisie manuellement.

Stack : Next.js (App Router) + Supabase (Postgres + Auth) + Tailwind.

## Principe

Pas de compteur numérique, donc pas de courbe de charge : l'utilisateur
relève lui-même les index de ses compteurs à intervalle irrégulier.

- Conso d'une période = différence entre deux relevés consécutifs.
- Le gaz est relevé en m³ et converti en kWh via un coefficient
  configurable (par défaut 11,5 kWh/m³, gaz riche distribué en Flandre —
  la valeur exacte figure sur la facture).
- La conso annuelle est extrapolée au prorata des jours couverts par les
  relevés, indépendamment pour l'élec et le gaz.
- Limite assumée : pas de correction saisonnière. Un historique couvrant
  uniquement l'hiver surestime le gaz annuel ; la fiabilité augmente avec
  la durée couverte.

## Contraintes de conception

- **Pas de souscription automatique** : une alerte ne contient qu'un lien
  vers la page du fournisseur et un résumé chiffré à copier/coller.
- **Pas de scraping** des tarifs : la base d'offres est saisie
  manuellement via un formulaire.

## Statut des modules

| Module | Statut |
| --- | --- |
| Schéma Supabase (`supabase/migrations/0001_init.sql`) | ✅ |
| Calcul de conso par différence d'index (`src/lib/readings`) | ✅ + tests |
| Simulation de coût annuel + classement (`src/lib/pricing`) | ✅ + tests |
| Sélection des contrats à alerter (`src/lib/alerts`) | ✅ + tests |
| Saisie des relevés — formulaire + historique éditable (`/readings`) | ✅ |
| Auth minimale (`/auth`) | ✅ |
| Base de tarifs (formulaire contracts) | ⏳ |
| Envoi email des alertes (Resend) | ⏳ |
| Dashboard complet | ⏳ |

## Schéma Supabase

Voir `supabase/migrations/0001_init.sql` :

- `meter_readings` — relevés d'index (date, index élec jour/nuit en kWh,
  index gaz en m³, note). Un relevé max par jour ; l'édition corrige.
- `contracts` — offres tarifaires saisies manuellement (fournisseur, prix
  kWh jour/nuit, prix gaz, redevances fixes, engagement). Un seul contrat
  `is_current_contract` par utilisateur.
- `contract_simulations` — historique des coûts annuels simulés.
- `user_settings` — seuil d'alerte (€/an), email de notification, seuil de
  rappel de relevé (jours), coefficient gaz m³→kWh.
- `alerts` — historique des alertes envoyées.

Toutes les tables ont RLS activé avec une policy `auth.uid() = user_id`.

## Moteurs de calcul (`src/lib`)

- `readings/consumption.ts` — `computeConsumptionPeriods` (différences
  entre relevés triés, index en recul signalé en warning et exclu),
  `annualizeConsumption` (prorata 365,25 j), `daysSinceLastReading` /
  `isReadingReminderDue` (rappel de relevé).
- `pricing/simulate.ts` — `simulateAnnualCost` (kWh jour/nuit x prix +
  gaz + redevances ; offre mono-horaire appliquée à la conso nuit si pas
  de tarif nuit ; redevance d'une énergie non consommée non comptée),
  `rankContracts` (classement + écart €/an vs contrat actuel).
- `alerts/shouldAlert.ts` — filtre des contrats dépassant le seuil
  d'économie configuré.

Tests : `npm test` (vitest).

## Setup local

```bash
cp .env.example .env.local   # renseigner les clés Supabase
npm install
npm run dev
```

Appliquer la migration sur un projet Supabase :

```bash
supabase db push
```

Première utilisation : créer son compte sur `/auth` (mono-utilisateur —
désactiver ensuite les inscriptions dans les réglages Supabase si
l'instance est exposée publiquement).
