-- Comptes du site ISTB : rôles élève / prof / admin et gestion des comptes depuis l'onglet « Comptes ».
-- À exécuter dans le SQL Editor du projet « ISTB EXAM », après schema.sql. Le script peut être relancé sans risque.
--   élève : ne gère aucun compte
--   prof  : crée des comptes élèves ; ne voit pas la liste des comptes et ne supprime personne
--   admin : crée, modifie (rôle, nom, mot de passe) et supprime tous les comptes, sauf le sien

alter table public.istb_membres add column if not exists nom text not null default '';
alter table public.istb_membres add column if not exists role text not null default 'eleve';
alter table public.istb_membres add column if not exists cree_par uuid references auth.users(id) on delete set null;
alter table public.istb_membres drop constraint if exists istb_membres_role_check;
alter table public.istb_membres add constraint istb_membres_role_check check (role in ('eleve', 'prof', 'admin'));

-- Adrien est le premier admin.
update public.istb_membres set role = 'admin', nom = case when nom = '' then 'Adrien Santos' else nom end
where user_id = (select id from auth.users where lower(email) = 'adriensantos2103@gmail.com');

-- Rôle de l'utilisateur connecté (null s'il n'est pas membre).
create or replace function public.istb_mon_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.istb_membres where user_id = auth.uid();
$$;

-- Liste des comptes (admin seulement).
create or replace function public.istb_comptes()
returns table (user_id uuid, identifiant text, nom text, role text, created_at timestamptz, derniere_connexion timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.istb_mon_role(), '') <> 'admin' then
    raise exception 'Accès réservé aux admins.';
  end if;
  return query
    select m.user_id, m.identifiant, m.nom, m.role, m.created_at, u.last_sign_in_at
    from public.istb_membres m join auth.users u on u.id = m.user_id
    order by case m.role when 'admin' then 0 when 'prof' then 1 else 2 end, m.nom, m.identifiant;
end $$;

-- Création d'un compte : un prof ne crée que des élèves, un admin crée tous les rôles.
-- L'élève se connecte avec son identifiant ; l'adresse e-mail interne n'est jamais utilisée pour écrire.
create or replace function public.istb_creer_compte(p_identifiant text, p_nom text, p_mot_de_passe text, p_role text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  mon_role text := public.istb_mon_role();
  v_id text := lower(trim(p_identifiant));
  v_email text;
  v_uid uuid := gen_random_uuid();
begin
  if coalesce(mon_role, '') not in ('prof', 'admin') then
    raise exception 'Seuls les profs et les admins peuvent créer des comptes.';
  end if;
  if mon_role = 'prof' and p_role <> 'eleve' then
    raise exception 'Un prof ne peut créer que des comptes élèves.';
  end if;
  if p_role not in ('eleve', 'prof', 'admin') then
    raise exception 'Rôle inconnu.';
  end if;
  if v_id !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'Identifiant invalide : 3 à 40 caractères, lettres minuscules, chiffres, point, tiret ou tiret bas.';
  end if;
  if length(coalesce(p_mot_de_passe, '')) < 8 then
    raise exception 'Le mot de passe doit faire au moins 8 caractères.';
  end if;
  if exists (select 1 from public.istb_membres where identifiant = v_id) then
    raise exception 'Cet identifiant est déjà pris.';
  end if;
  v_email := v_id || '@comptes.istb.example';
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Cet identifiant est déjà pris.';
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('nom', trim(coalesce(p_nom, ''))), now(), now(),
    '', '', '', '');
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', null, now(), now());

  insert into public.istb_membres (user_id, identifiant, nom, role, cree_par)
  values (v_uid, v_id, trim(coalesce(p_nom, '')), p_role, auth.uid());
  return v_uid;
end $$;

-- Modification d'un compte (admin) : nom, rôle et/ou nouveau mot de passe. Pas de changement de son propre rôle.
create or replace function public.istb_modifier_compte(p_user_id uuid, p_nom text, p_role text, p_mot_de_passe text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if coalesce(public.istb_mon_role(), '') <> 'admin' then
    raise exception 'Seuls les admins peuvent modifier un compte.';
  end if;
  if not exists (select 1 from public.istb_membres where user_id = p_user_id) then
    raise exception 'Compte introuvable.';
  end if;
  if p_role is not null and p_role not in ('eleve', 'prof', 'admin') then
    raise exception 'Rôle inconnu.';
  end if;
  if p_user_id = auth.uid() and p_role is not null and p_role <> 'admin' then
    raise exception 'Tu ne peux pas retirer ton propre rôle admin.';
  end if;
  if p_mot_de_passe is not null and length(p_mot_de_passe) < 8 then
    raise exception 'Le mot de passe doit faire au moins 8 caractères.';
  end if;
  update public.istb_membres
    set nom = coalesce(trim(p_nom), nom), role = coalesce(p_role, role)
    where user_id = p_user_id;
  if p_mot_de_passe is not null then
    update auth.users set encrypted_password = extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), updated_at = now()
    where id = p_user_id;
  end if;
end $$;

-- Suppression d'un compte et de tous ses chantiers (admin), sauf le sien.
create or replace function public.istb_supprimer_compte(p_user_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if coalesce(public.istb_mon_role(), '') <> 'admin' then
    raise exception 'Seuls les admins peuvent supprimer un compte.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Tu ne peux pas supprimer ton propre compte.';
  end if;
  if not exists (select 1 from public.istb_membres where user_id = p_user_id) then
    raise exception 'Compte introuvable.';
  end if;
  delete from auth.users where id = p_user_id;  -- supprime aussi istb_membres et istb_docs (on delete cascade)
end $$;

revoke all on function public.istb_mon_role(), public.istb_comptes(), public.istb_creer_compte(text, text, text, text),
  public.istb_modifier_compte(uuid, text, text, text), public.istb_supprimer_compte(uuid) from public, anon;
grant execute on function public.istb_mon_role(), public.istb_comptes(), public.istb_creer_compte(text, text, text, text),
  public.istb_modifier_compte(uuid, text, text, text), public.istb_supprimer_compte(uuid) to authenticated;

-- Vérification : doit afficher « adrien | admin ».
select identifiant, role from public.istb_membres;
