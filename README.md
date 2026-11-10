# Bull & Bear Insurance Broker

Site Astro, direction artistique Atelier V2, et Studio de contenu privé adossé à Directus sur Railway.

- Site de travail : https://bullbear-insurance-preview.vercel.app/
- Studio : https://studio-production-2fc1.up.railway.app/
- Directus : https://directus-production-1a26.up.railway.app/admin

## Développement et vérification

Node 24, `npm ci`, `npm run build`, puis `npm run preview -- --port 4387`. `npm test` vérifie les routes, les liens, les six langues, le consentement, les erreurs du formulaire, les métadonnées, l'accessibilité et les formats 320–1440 px. Installer le navigateur de test avec `npx playwright install chromium`. `npm run test:cms` vérifie les droits, les brouillons, les traductions et les soumissions. `npm run test:content` compare les textes, les formulaires et les fichiers d’origine aux pages générées. Les liens de consultation doivent être ouverts dans Firefox sur macOS : `open -a Firefox <url>`.

`npm run dev` sert les composants espagnols ; la construction produit les six versions statiques. Sans environnement Directus, le build utilise les contenus et traductions versionnés. Avec `DIRECTUS_URL`, le jeton de lecture est obligatoire ; une erreur CMS, une image inaccessible ou une traduction manquante/interrompue fait échouer le build et conserve le déploiement précédent.

## Contenus et langues

L'espagnol conserve les URL historiques. Les versions anglaise, française, italienne, allemande et russe sont sous `/en/`, `/fr/`, `/it/`, `/de/` et `/ru/`. Les pages générales utilisent `about`, `contact`, `privacy`, `careers` et `insights` ; les services et articles conservent leurs identifiants historiques sous chaque préfixe. Le sélecteur conserve la page consultée. 29 pages × 6 langues = 174 routes, avec canonical, hreflang, sitemap et données structurées localisés.

Les 17 services comportent désormais leurs textes métier complets. La présentation, le recrutement, les deux articles historiques, les coordonnées et les champs/choix des quatre formulaires spécialisés sont repris du site source. Deux PDF originaux et 115 images/icônes ont été copiés localement. Le contrôle de couverture compare les blocs source au HTML réellement généré ; voir [le rapport de migration](docs/content-migration-2026-11-10.md). Le nouvel export WordPress est conservé dans `docs/source/wordpress-pages-2026-11-09.json` ; les anciens inventaires restent archivés. Les contenus factices du thème n'ont pas été importés. L'avis espagnol original de 2024 est conservé avec un complément décrivant le formulaire de ce site ; les traductions sont indicatives. Les articles historiques conservent leur date et leur mention d'archive.

Les textes affichés sont indexés par une clé stable calculée sur la source espagnole dans `cms/content-inventory.json`. Le Studio édite les contenus existants par page, les titres, descriptions SEO, services, articles, FAQ, éléments partagés et textes de formulaire. Ajouter une nouvelle structure de page ou une nouvelle route reste un changement de code ; le Studio ne présente pas de bouton de création fictif.

## Frontend et backend

Le frontend Vercel garde le design, le rendu statique, les interactions, le sélecteur de langue et les métadonnées. Aucun jeton Directus n'est envoyé au navigateur public. Les images du CMS sont copiées au build dans les assets statiques de Vercel.

Directus conserve les textes/traductions, brouillons, images et demandes privées dans PostgreSQL. Le Studio Railway gère l'authentification Directus, les sessions chiffrées HttpOnly, les traductions automatiques, la relecture, l'enregistrement des demandes et leur suivi. Les demandes ont un statut, des notes et une suppression définitive. Aucun envoi d'email ni connecteur CRM externe n'est annoncé ou activé.

Le formulaire envoie à `/api/contact` sur le même domaine. La fonction Vercel relaie vers Railway avec un secret serveur ; le service Railway valide le consentement, les champs, la langue, le honeypot et une limite de soumissions. Le jeton utilisé ne peut que créer des demandes, sans lecture. Le consentement et sa version sont enregistrés. Les données ne sont pas stockées dans le navigateur. Le backend conserve aussi les prénom/nom, téléphone, commentaire, formulaire d’origine et type précis d’assurance sélectionné.

## Publication

Branche de publication : `main`, qui reprend la version Atelier V2 validée de `feat/atelier-v2-preview`. La branche par défaut GitHub et la branche Production Vercel sont `main`. Le Studio publie sur cette branche. Les variables serveur Directus et formulaire sont configurées dans l’environnement Production de ce projet Vercel ; les variables Preview de la branche de travail sont conservées. L’alias `bullbear-insurance-preview.vercel.app` sert la version Production du projet `bullbear-insurance-v2-preview`. Le site reste non indexable.

Le Studio garde les changements en brouillon avec leurs cinq traductions ; publier vérifie leur cohérence, les prépare dans Directus et déclenche un build Vercel. Un lancement du build n'est pas une confirmation de réussite : vérifier Vercel avant d'annoncer la nouvelle version disponible. La prévisualisation garde `noindex, nofollow`, y compris dans les en-têtes HTTP et robots.txt.

Les publications Git et les hooks Vercel exigent un dernier commit signé et vérifié par GitHub. Conserver cette protection ; utiliser un commit vérifié pour chaque nouvelle version de code. Au 10 novembre 2026, GitHub Actions ne peut pas démarrer en raison du blocage de facturation du compte GitHub ; les contrôles ont été exécutés localement, y compris un build avec Node 24 et le fuseau UTC de Vercel.

Déploiement manuel du frontend depuis `main` : `vercel deploy --prod --yes`, puis vérifier l'alias et les routes. Déploiement du Studio : `railway up cms --path-as-root --service studio --detach`, puis vérifier `/health`. Les identifiants d'infrastructure non secrets sont dans `cms/deployment.json`.

Voir [le guide du backend](cms/README.md) pour les accès, le bootstrap et les sauvegardes.

La reprise du 10 novembre 2026 et la correction de la structure de l’accueil sont couvertes par 30 tests locaux (11 backend, 6 contrôles du contenu et de son ordre, 13 tests navigateur). L’accueil conserve en ouverture le hero architectural approuvé, avec son texte et sa typographie. Les trois thèmes du site source sont des diapositives supplémentaires ; les sections métier suivent avec leurs textes et leur ordre d’origine. Les documents et les blocs métier disposent de leur registre de provenance dans le rapport de migration.
