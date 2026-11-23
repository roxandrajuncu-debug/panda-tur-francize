-- ДЗ №2. Rulează O SINGURĂ DATĂ în Supabase → SQL Editor → New query → Run (după schema.sql).

-- 1. CRM: etapa nouă „Achitat”, istoria etapelor, document original, utilizator Telegram
alter table public.leads drop constraint if exists leads_stage_check;
alter table public.leads add constraint leads_stage_check
  check (stage in ('nou', 'apel', 'intalnire', 'contract', 'achitat', 'respins'));
alter table public.leads add column if not exists history    jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists company    text  not null default '';
alter table public.leads add column if not exists doc_path   text  not null default '';
alter table public.leads add column if not exists doc_type   text  not null default '';
alter table public.leads add column if not exists tg_user_id bigint;
alter table public.leads add column if not exists package    text  not null default '';
create index if not exists leads_tg_user_idx on public.leads (tg_user_id);

-- Cererile vechi primesc în istorie etapa la care sunt acum
update public.leads
   set history = jsonb_build_array(jsonb_build_object('stage', stage, 'at', created_at))
 where history = '[]'::jsonb;

-- 2. Istoria generărilor de imagini (și limita pe zi)
create table if not exists public.generations (
  id         text primary key,
  created_at timestamptz not null default now(),
  user_key   text not null,
  prompt     text not null,
  prompt_en  text not null default '',
  style      text not null default '',
  path       text not null default '',
  status     text not null default 'pending' check (status in ('pending', 'done', 'error'))
);
create index if not exists generations_user_day_idx on public.generations (user_key, created_at desc);
alter table public.generations enable row level security;

-- 3. Fișiere private: originalele documentelor și imaginile generate
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('generated', 'generated', false)
on conflict (id) do nothing;
