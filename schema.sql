-- Island Clash — Supabase database
-- Voert dit bestand uit in Supabase > SQL Editor.
-- Dit schema gebruikt één JSONB snapshot zodat de bestaande Island Clash-app
-- alle ic_* localStorage-data zonder grote herbouw kan synchroniseren.
--
-- LET OP: deze eenvoudige browser-directe variant maakt de state-tabel lees/schrijfbaar
-- voor anon/authenticated. Gebruik dit alleen voor een privé schoolproject/prototype.
-- Gebruik voor productie RLS + Auth + server-side controles.

create table if not exists public.ic_global_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ic_global_state enable row level security;

-- Verwijder oude policies met dezelfde namen voordat ze opnieuw worden aangemaakt.
drop policy if exists "Island Clash public read" on public.ic_global_state;
drop policy if exists "Island Clash public write" on public.ic_global_state;
drop policy if exists "Island Clash public update" on public.ic_global_state;

create policy "Island Clash public read"
on public.ic_global_state
for select
to anon, authenticated
using (true);

create policy "Island Clash public write"
on public.ic_global_state
for insert
to anon, authenticated
with check (true);

create policy "Island Clash public update"
on public.ic_global_state
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.ic_global_state to anon, authenticated;

-- Optioneel: seed één lege rij. De website vult deze automatisch zodra hij start.
insert into public.ic_global_state (id, state)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Supabase Auth testaccounts
-- -------------------------------------------------------------
-- De aparte supabase-login.js verwacht dat een Auth-gebruiker bestaat.
-- Voor username 'docent' gebruikt hij standaard:
--   docent@islandclash.local
-- Maak die Auth-gebruiker aan via Supabase Dashboard > Authentication > Users
-- (of via een veilige server-side/adminflow). Zet nooit service_role in de HTML.
