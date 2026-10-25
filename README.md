# ISTB – Suivi de chantier

Site ISTB (suivi financier de chantier : étude de prix, Point 0, pointage, achats, tableaux de bord), aux couleurs de l'ISTB, avec connexion par identifiant + mot de passe. Plusieurs chantiers ; Grimonpont est le premier.

- **Appli** : `src/exam.html` (même appli que l'onglet EXAM de FACE), habillée par `src/theme-exam.css`.
- **Connexion et sauvegarde** : `src/main.ts`, projet Supabase « ISTB EXAM » (compte STS). La clé dans le code est la clé *publishable*, publique par conception ; les données sont protégées par la RLS.
- **Base** : `supabase/schema.sql`, à exécuter dans le SQL Editor du projet (relançable sans risque).
- **Comptes** : `supabase/comptes.sql` (après `schema.sql`) ajoute les rôles élève / prof / admin. Onglet « Comptes » de l'appli (`src/comptes-vue.js`) : un prof crée des comptes élèves, un admin crée, modifie et supprime tous les comptes. Les comptes créés là se connectent avec leur identifiant (adresse interne `identifiant@comptes.istb.example`, jamais utilisée pour écrire).
- **Mise en ligne** : https://adriensantos2103-lgtm.github.io/ISTB/ ; automatique à chaque push sur `main` (`.github/workflows/pages.yml`, GitHub Pages en source « GitHub Actions »).
- **En local** : `npm install`, puis `npm run dev`.
