-- Rulează o singură dată în Supabase → SQL Editor → New query → Run.
create table if not exists public.leads (
  id          text primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  status      text not null default 'nouă' check (status in ('nouă', 'în lucru', 'închisă')),
  stage       text not null default 'nou' check (stage in ('nou', 'apel', 'intalnire', 'contract', 'respins')),
  name        text not null,
  phone       text not null,
  email       text not null default '',
  city        text not null default '',
  source      text not null default 'site',
  budget      text not null default '',
  space       text not null default '',
  timeline    text not null default '',
  experience  text not null default '',
  comment     text not null default '',
  notes       text not null default ''
);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- RLS pornit și fără politici: cheia publică (anon) nu vede nimic.
-- Doar serverul de pe Vercel, cu cheia secretă din variabilele de mediu, citește și scrie.
alter table public.leads enable row level security;
alter table public.settings enable row level security;
