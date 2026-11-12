# J.A.R.V.I.S. — Développement via GitHub

## Déjà présent
Ce dépôt héberge un CRM Mefire Premium en Next.js, avec PostgreSQL/Neon, les commandes, les paiements, le webhook WhatsApp et des procédures supervisées. Le prototype ZIP local précédent est une réalisation distincte : ne pas remplacer les sources de ce dépôt par le ZIP.

## Nouvel espace JARVIS
Ouvrir `/jarvis` après connexion administrateur :
- conversation et historique dans la table existante `ai_admin_commands` (pas de migration supplémentaire pour cette itération) ;
- bilan quotidien réel en lecture seule, calculé à partir des entrées PostgreSQL à l'heure de Douala ;
- comparatif des commandes du jour avec hier ;
- commandes susceptibles de modifier les données préparées via le planificateur existant, avec confirmation humaine obligatoire.
- Le bilan financier ne constitue pas un bénéfice net : les achats de licences doivent être enregistrés avant de calculer la marge.

La connexion WhatsApp et les automatisations sont des sous-systèmes distincts, et leur présence dans le code ne signifie pas qu'ils soient configurés ou activés.

## Déploiement continu
**Option préférée :** connecter une seule fois ce dépôt GitHub à un projet Vercel. Chaque push sur `main` déclenche alors automatiquement le déploiement Vercel, si cette intégration est activée. Vérifier les journaux Vercel pour confirmer chaque version. Ne pas partager de jetons ou secrets dans GitHub ou le chat.

**Alternative GitHub Actions :** le workflow `.github/workflows/jarvis-ci-deploy.yml` exécute une vérification TypeScript et une compilation sur chaque push. Pour activer son job Vercel, ajouter dans Settings → Secrets and variables → Actions les secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, puis la variable `JARVIS_VERCEL_DEPLOY_ENABLED=true`. Ne pas activer cet autre mécanisme si l'intégration GitHub-Vercel déploie déjà automatiquement.

Dans Vercel, renseigner individuellement les variables privées `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, puis une clé `OPENAI_API_KEY` ou `OPENROUTER_API_KEY`. Utiliser des secrets robustes et activer un second facteur d'authentification pour les comptes d'administration. Ne jamais committer un fichier `.env`.

## Vérifier avant de mettre des clients réels
1. Vérifier que le workflow GitHub Actions est vert.
2. Vérifier que les migrations historiques ont été appliquées à la base Neon.
3. Se connecter au tableau de bord et ouvrir `/jarvis`.
4. Demander `Jarvis, fais-moi le bilan d'aujourd'hui` : les chiffres doivent correspondre aux données de PostgreSQL.
5. Donner une instruction de modification : vérifier qu'elle n'est pas exécutée sans confirmation explicite.
6. Ne brancher WhatsApp Business en production qu'après tests sur un numéro dédié et vérification des politiques des plateformes d'abonnements.

## Limites connues
- La fonctionnalité de rapport utilise des chiffres actuellement stockés ; elle n'importe pas l'historique WhatsApp.
- Le compteur de ventes est le nombre de commandes créées, pas nécessairement les commandes encaissées.
- Les preuves de paiement reçues ne doivent pas être confondues avec les encaissements vérifiés.
- L'IA et l'activation WhatsApp nécessitent leurs propres identifiants et tests de bout en bout.
- Ni GitHub ni GitHub Actions seuls n'hébergent le backend Next.js ou la base de données.
