create extension if not exists pgcrypto;

create table if not exists public.countries (
  code text primary key,
  cca2 text not null unique,
  name_common text not null,
  name_official text,
  currencies jsonb,
  languages jsonb,
  timezones text[],
  region text,
  subregion text,
  borders text[],
  flag text,
  landlocked boolean,
  gini jsonb,
  cost_of_living_index numeric,
  safety_index integer,
  extra_facts jsonb default '{}'::jsonb
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  destination_name text not null,
  country_code text not null references public.countries(code),
  country_name text,
  latitude numeric not null,
  longitude numeric not null,
  timezone text,
  date_start date not null,
  date_end date not null,
  trip_type text not null check (trip_type in ('city', 'beach', 'adventure', 'relax')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_valid_dates check (date_start <= date_end)
);

create index if not exists trips_owner_key_date_start_idx
  on public.trips (owner_key, date_start);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;

create trigger trips_set_updated_at
before update on public.trips
for each row
execute function public.set_updated_at();

grant usage on schema public to service_role;
grant select on table public.countries to service_role;
grant select, insert, update, delete on table public.trips to service_role;
