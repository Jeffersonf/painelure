-- PainelURE relational schema for Supabase.
-- Run this file in Supabase SQL Editor once for the project used by the app.

create table if not exists public.setechub_settings (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.setechub_users (
  id text primary key,
  label text,
  ref text,
  ref2 text,
  period text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.setechub_municipalities (like public.setechub_users including all);
create table if not exists public.setechub_sectors (like public.setechub_users including all);
create table if not exists public.setechub_directory_contacts (like public.setechub_users including all);
create table if not exists public.setechub_official_links (like public.setechub_users including all);
create table if not exists public.setechub_checklist_items (like public.setechub_users including all);
create table if not exists public.setechub_tasks (like public.setechub_users including all);
create table if not exists public.setechub_calls (like public.setechub_users including all);
create table if not exists public.setechub_schools (like public.setechub_users including all);
create table if not exists public.setechub_supervisors (like public.setechub_users including all);
create table if not exists public.setechub_supervisor_visits (like public.setechub_users including all);
create table if not exists public.setechub_school_profiles (like public.setechub_users including all);
create table if not exists public.setechub_school_imports (like public.setechub_users including all);
create table if not exists public.setechub_school_assets (like public.setechub_users including all);
create table if not exists public.setechub_school_networks (like public.setechub_users including all);
create table if not exists public.setechub_assets (like public.setechub_users including all);
create table if not exists public.setechub_notes (like public.setechub_users including all);

create index if not exists setechub_users_label_idx on public.setechub_users (label);
create index if not exists setechub_schools_label_idx on public.setechub_schools (label);
create index if not exists setechub_schools_cie_idx on public.setechub_schools (ref);
create index if not exists setechub_calls_school_idx on public.setechub_calls (ref);
create index if not exists setechub_calls_status_idx on public.setechub_calls (status);
create index if not exists setechub_tasks_status_idx on public.setechub_tasks (status);
create index if not exists setechub_supervisor_visits_period_idx on public.setechub_supervisor_visits (period);
create index if not exists setechub_school_assets_school_idx on public.setechub_school_assets (ref);
create index if not exists setechub_school_assets_status_idx on public.setechub_school_assets (status);
create index if not exists setechub_official_links_period_idx on public.setechub_official_links (period);

alter table public.setechub_settings enable row level security;
alter table public.setechub_users enable row level security;
alter table public.setechub_municipalities enable row level security;
alter table public.setechub_sectors enable row level security;
alter table public.setechub_directory_contacts enable row level security;
alter table public.setechub_official_links enable row level security;
alter table public.setechub_checklist_items enable row level security;
alter table public.setechub_tasks enable row level security;
alter table public.setechub_calls enable row level security;
alter table public.setechub_schools enable row level security;
alter table public.setechub_supervisors enable row level security;
alter table public.setechub_supervisor_visits enable row level security;
alter table public.setechub_school_profiles enable row level security;
alter table public.setechub_school_imports enable row level security;
alter table public.setechub_school_assets enable row level security;
alter table public.setechub_school_networks enable row level security;
alter table public.setechub_assets enable row level security;
alter table public.setechub_notes enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'setechub_settings',
    'setechub_users',
    'setechub_municipalities',
    'setechub_sectors',
    'setechub_directory_contacts',
    'setechub_official_links',
    'setechub_checklist_items',
    'setechub_tasks',
    'setechub_calls',
    'setechub_schools',
    'setechub_supervisors',
    'setechub_supervisor_visits',
    'setechub_school_profiles',
    'setechub_school_imports',
    'setechub_school_assets',
    'setechub_school_networks',
    'setechub_assets',
    'setechub_notes'
  ]
  loop
    execute format('drop policy if exists "%I_anon_select" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%I_anon_insert" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%I_anon_update" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%I_anon_delete" on public.%I', table_name, table_name);
    execute format('create policy "%I_anon_select" on public.%I for select to anon using (true)', table_name, table_name);
    execute format('create policy "%I_anon_insert" on public.%I for insert to anon with check (true)', table_name, table_name);
    execute format('create policy "%I_anon_update" on public.%I for update to anon using (true) with check (true)', table_name, table_name);
    execute format('create policy "%I_anon_delete" on public.%I for delete to anon using (true)', table_name, table_name);
  end loop;
end $$;
