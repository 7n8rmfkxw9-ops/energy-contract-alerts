# Energy Contract Alerts

This repo was split out from [european-coffee-connect](https://github.com/7n8rmfkxw9-ops/european-coffee-connect)
(branch `claude/energy-contract-alerts-k7lvhi`, migrated 2026-07-02) so the
energy-tracking side project can live on its own.

## Where the actual app is

The real project is in [`energy-app/`](./energy-app) — see
[`energy-app/README.md`](./energy-app/README.md) for full details. In short:
a personal (single-user) Next.js + Supabase app to track home electricity
and gas consumption from manual analog meter readings, and get alerted when
a cheaper energy contract shows up in a manually-entered rates database.

Stack: Next.js (App Router), Supabase (Postgres + Auth), Tailwind, Vitest.

Leftover `european-coffee-connect` scaffolding that was carried over during
the migration (top-level `src/`, `package.json`, `supabase/`, `.env`, etc.)
has been removed, so `energy-app/` is the whole project.
