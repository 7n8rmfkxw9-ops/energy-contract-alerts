# Energy Contract Alerts

Web app personnelle (mono-utilisateur) pour piloter des contrats
d'électricité et de gaz en Belgique : import de la consommation
quart-horaire depuis Mijn Fluvius, comparaison avec les tarifs du marché
saisis manuellement, et alertes email en cas d'économie potentielle.

Stack : Next.js (App Router) + Supabase (Postgres + Auth) + Tailwind.

## Contraintes de conception

- **Pas de scraping** de mijn.fluvius.be : seul l'import manuel d'un CSV
  exporté par l'utilisateur lui-même est supporté.
- **Pas de souscription automatique** : une alerte ne contient qu'un lien
  vers la page du fournisseur et un résumé chiffré à copier/coller.

## Statut des modules

| Module | Statut |
| --- | --- |
| Schéma Supabase (`supabase/migrations/0001_init.sql`) | ✅ |
| Structure Next.js | ✅ (scaffold) |
| Ingestion : parsing CSV Fluvius (`src/lib/fluvius`) | ✅ |
| Ingestion : upload UI + écriture en base | ⏳ |
| Base de tarifs (formulaire contracts) | ⏳ |
| Moteur de comparaison | ⏳ |
| Alertes email | ⏳ |
| Dashboard | ⏳ |

## Schéma Supabase

Voir `supabase/migrations/0001_init.sql`. Résumé des tables :

- `csv_imports` — un enregistrement par fichier CSV importé (traçabilité,
  affichage "dernier import il y a X jours").
- `consumption_readings` — relevés quart-horaires, table unique quel que
  soit la source (`fluvius_csv` aujourd'hui, `p1_realtime` plus tard pour
  un boîtier HomeWizard par ex.), différenciée par la colonne `source`.
- `contracts` — offres tarifaires saisies manuellement (fournisseur, prix
  kWh jour/nuit, redevance, engagement...). Un seul contrat peut être
  marqué `is_current_contract` par utilisateur.
- `contract_simulations` — historique des coûts annuels simulés par
  contrat, pour traçabilité et affichage dashboard.
- `alert_settings` / `alerts` — seuil configurable et historique des
  alertes envoyées.

Toutes les tables ont RLS activé avec une policy `auth.uid() = user_id`.

## Module CSV Fluvius (`src/lib/fluvius`)

- `parseFluviusCsv(csvText, energyType)` — point d'entrée. `energyType`
  est fourni explicitement par l'UI d'upload (Fluvius exporte élec et gaz
  dans deux fichiers séparés).
- Détection tolérante du délimiteur (`;` ou `,`) et des en-têtes (matching
  par alias normalisés, pour encaisser les variantes de libellés Fluvius).
- Nombres au format belge (virgule décimale) et dates `DD-MM-YYYY`.
- Conversion des horodatages locaux Europe/Brussels vers UTC (gestion du
  changement d'heure été/hiver) via `timezone.ts`, sans dépendance externe.
- Les lignes "Injectie" (injection solaire) sont ignorées : hors scope du
  MVP.
- Les registres jour/nuit qui tombent sur le même créneau quart-horaire
  sont sommés en une seule valeur ; la distinction jour/nuit pour la
  tarification est recalculée plus tard à partir de l'heure du créneau,
  pas du nom du registre Fluvius.

Tests : `src/lib/fluvius/*.test.ts` (`npm test`).

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
