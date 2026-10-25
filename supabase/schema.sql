-- Base du site « ISTB – EXAM Santos Adrien » : projet Supabase « ISTB EXAM » (compte STS), PAS celui de FACE.
-- À exécuter dans le SQL Editor de ce projet, APRÈS avoir créé le compte d'Adrien
-- (Authentication > Users > Add user > Create new user, « Auto Confirm User » coché).
-- Le script peut être relancé sans risque.

create table if not exists public.istb_membres (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  identifiant text not null unique check (identifiant = lower(identifiant) and identifiant !~ '@'),
  created_at  timestamptz not null default now()
);
alter table public.istb_membres enable row level security;
drop policy if exists istb_membres_soi on public.istb_membres;
create policy istb_membres_soi on public.istb_membres for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.istb_membres to authenticated;

-- Une ligne = un document de l'appli (index des chantiers, bibliothèque, ou un chantier complet en JSON).
create table if not exists public.istb_docs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cle        text not null,
  json       text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, cle)
);
alter table public.istb_docs enable row level security;
drop policy if exists istb_docs_membre on public.istb_docs;
create policy istb_docs_membre on public.istb_docs for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.istb_membres m where m.user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.istb_membres m where m.user_id = (select auth.uid())));
grant select, insert, update, delete on public.istb_docs to authenticated;

-- Connexion par identifiant : renvoie l'e-mail de connexion d'un membre ISTB (null sinon).
create or replace function public.istb_email(p_identifiant text)
returns text language sql stable security definer set search_path = '' as $$
  select u.email from public.istb_membres m join auth.users u on u.id = m.user_id
  where m.identifiant = lower(trim(p_identifiant));
$$;
revoke all on function public.istb_email(text) from public;
grant execute on function public.istb_email(text) to anon, authenticated;

-- Premier membre : Adrien, identifiant « adrien ».
insert into public.istb_membres (user_id, identifiant)
select id, 'adrien' from auth.users where lower(email) = 'adriensantos2103@gmail.com'
on conflict (user_id) do nothing;

-- Premier chantier : Grimonpont (id « ex » = données de référence intégrées à l'appli).
insert into public.istb_docs (user_id, cle, json)
select user_id, 'index', '{"cur":"ex","items":[{"id":"ex","name":"Grimonpont – Groupe scolaire Sailly-Labourse"}]}'
from public.istb_membres
on conflict (user_id, cle) do nothing;

-- Vérification : doit afficher « adrien ».
select identifiant from public.istb_membres;
