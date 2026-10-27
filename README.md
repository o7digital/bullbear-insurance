# Bull & Bear — Atelier V2

Projet fourni par le client, conservant la direction artistique V2. Version de prévisualisation uniquement.

## Développement

Node 24, puis `npm ci`, `npm run dev` et `npm run build`.

Pour les tests : `npm run preview -- --port 4387`, attendre le démarrage, puis `npm test`. Installer Chromium au besoin avec `npx playwright install chromium`. `TEST_BASE_URL` permet de tester une autre URL.

## Contenu et routes

Les données validées contre le site existant sont dans `src/data/`. Les captures et `Preview-Interactiva.html` sont les références originales ; elles ne sont pas publiées. L'inventaire historique et les décisions de migration se trouvent dans `docs/url-inventory.md`. Les coordonnées viennent des pages Contacto et Aviso de privacidad. Les contenus de thème, faux avis et faux membres d'équipe n'ont pas été importés.

L'avis de confidentialité est une reproduction du document publié en 2024 : aucune validation juridique nouvelle n'est prétendue. Les services sont des résumés éditoriaux des pages existantes, à approuver avant production.

## Déploiement

Projet Vercel séparé : `bullbear-insurance-v2-preview`, connecté à GitHub. Déployer exclusivement en preview avec `vercel deploy --yes`. Ne pas utiliser `--prod`, ajouter le domaine officiel ou changer son DNS sans autorisation explicite. La branche de travail est `feat/atelier-v2-preview` ; les déploiements Git de `main` sont désactivés dans `vercel.json`.

La prévisualisation porte `noindex, nofollow` en HTML et en en-tête HTTP, et robots.txt interdit l'exploration. Le sitemap garde les futures URL canoniques historiques. Avant une production autorisée : revue du contenu et des obligations légales, Formspree, vérification des redirections avec les données Search Console, puis mise à jour des en-têtes Vercel et de `PRODUCTION_INDEXING_APPROVED`. Ce drapeau seul ne retire pas le blocage HTTP.

## Formulaire et intégrations

Selon l'instruction du client, le formulaire reste une démo sans envoi, stockage, suivi ni cookie. Il utilise `method="dialog"`, une validation navigateur et une simulation JavaScript avec remise à zéro. Aucun backend n'est activé. Formspree sera raccordé ensuite : identifiant du formulaire, destinataire vérifié, consentement final, filtrage antispam, politique de conservation et test d'envoi seront nécessaires. La CSP `form-action 'none'` bloque actuellement toute soumission réseau.

Les contrats DatoCMS et Olivia sont dans `src/lib/integrations.ts`. Aucun SDK, compte, appel réseau ou service payant n'est activé. Les noms de variables réservés sont décrits dans `.env.example` ; ne jamais versionner de secret.

## Dépendances

L'archive utilisait Astro 5. L'installation initiale résolvait Astro 5.18.2 avec cinq alertes npm (dont une critique). Mise à niveau vers Astro 7.4.2 pour corriger ces alertes, sans refonte du design. Le rendu est entièrement statique ; aucune optimisation d'image à la demande ni fonction serveur.
