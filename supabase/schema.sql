-- Elevate data model. Run in the Supabase SQL editor before seeding.
-- Incentive: one row per DSE (keyed by DSE/BO code); the raw sheet row as JSONB.
create table if not exists public.incentive (
  code text primary key,
  row  jsonb not null
);
-- Sales-Progression dataset (master/monthly/targets/meta) as a single JSONB blob.
create table if not exists public.sp_dataset (
  id   int  primary key default 1,
  data jsonb not null
);
-- NOTE: enable Row Level Security + per-DSE policies in the auth phase.
-- The API currently uses the service key server-side only (never exposed to the browser).
