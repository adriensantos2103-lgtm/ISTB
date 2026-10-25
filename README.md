# ISTB – EXAM Santos Adrien

Site de l'appli d'examen ISTB (suivi financier de chantier : étude de prix, Point 0, pointage, achats, tableaux de bord), aux couleurs de l'ISTB, avec connexion par identifiant + mot de passe. Plusieurs chantiers ; Grimonpont est le premier.

- **Appli** : `src/exam.html` (même appli que l'onglet EXAM de FACE), habillée par `src/theme-exam.css`.
- **Connexion et sauvegarde** : `src/main.ts`, projet Supabase « ISTB EXAM » (compte STS). La clé dans le code est la clé *publishable*, publique par conception ; les données sont protégées par la RLS.
- **Base** : `supabase/schema.sql`, à exécuter dans le SQL Editor du projet (relançable sans risque).
- **Ajouter un accès** : créer le compte dans Supabase (Authentication > Users > Add user, « Auto Confirm User »), puis
  `insert into istb_membres (user_id, identifiant) select id, 'identifiant' from auth.users where email = 'adresse@exemple.fr';`
- **Mise en ligne** : https://adriensantos2103-lgtm.github.io/ISTB/ ; automatique à chaque push sur `main` (`.github/workflows/pages.yml`, GitHub Pages en source « GitHub Actions »).
- **En local** : `npm install`, puis `npm run dev`.
