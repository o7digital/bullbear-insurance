# Livraison de prévisualisation — Bull & Bear V2

Date : 26 octobre 2026 (Mexico).

## Prévisualisation

- Site : https://bullbear-insurance-v2-preview-9fsds8z3i-olivier-steineur.vercel.app/
- Contact : https://bullbear-insurance-v2-preview-9fsds8z3i-olivier-steineur.vercel.app/contacto/
- Exemple de service : https://bullbear-insurance-v2-preview-9fsds8z3i-olivier-steineur.vercel.app/service/lineas-financieras/
- Inspection Vercel : https://vercel.com/olivier-steineur/bullbear-insurance-v2-preview/3FpPxvucHNf9SGJ2NvF8g5Q3zy5P
- Dépôt : https://github.com/o7digital/bullbear-insurance ; branche `feat/atelier-v2-preview`.

Le domaine officiel, son hébergement existant et son DNS n'ont pas été modifiés. Le projet Vercel est distinct et relié au dépôt. Son premier déploiement a été automatiquement classé « production » par Vercel sur le seul sous-domaine technique du nouveau projet ; la version finale liée ci-dessus est bien un déploiement Preview. Aucun domaine officiel n'a été ajouté. L'authentification Vercel de ce nouveau projet a été désactivée pour rendre la démo consultable. Toutes les pages restent bloquées à l'indexation par HTML, HTTP et robots.txt.

## Réalisation

Reprise du code Astro de l'archive, sans reconstruction : image architecturale WebP, DM Sans, EB Garamond, couleurs, cartes, grille, responsive et interactions V2 conservés. Quelques textes secondaires ont été légèrement assombris pour les contrastes WCAG. Polices auto-hébergées avec leurs licences pour éviter les requêtes Google Fonts.

26 pages statiques : accueil, présentation, contact, recrutement, confidentialité, index d'articles, deux articles historiques, 17 services et page 404. Les chemins utiles sont conservés ; quatre anciennes pages de formulaire sont redirigées en HTTP 301. Les anciennes pages de thème ne font pas l'objet de redirections générales sans examen Search Console.

Métadonnées par page, canonicals, Open Graph, JSON-LD InsuranceAgency/WebSite/WebPage/Service, sitemap et robots ajoutés. Aucune note ou recommandation client inventée. Les coordonnées ont été recoupées avec les pages Contacto et Aviso de privacidad. Les textes des services sont des résumés éditoriaux, les articles et l'avis sont des reprises d'archives publiées.

Le formulaire est volontairement une démo, selon la clarification du client : aucun envoi ni stockage. Validation des champs et du consentement, résultat explicite de simulation, remise à zéro des données. La politique CSP interdit les soumissions réseau. Formspree sera raccordé ultérieurement. DatoCMS et Olivia restent des contrats d'intégration inactifs, sans SDK, compte ni facturation.

Astro mis à niveau de 5.18.2 vers 7.4.2 pour résoudre les cinq alertes npm initiales ; Node 24 et lockfile fixent l'environnement. Aucune refonte visuelle liée à cette migration. Guide officiel : https://docs.astro.build/en/guides/upgrade-to/v7/.

## Validation

- `npm install`, puis `npm run build` : succès, 26 pages générées.
- `npm audit` : zéro vulnérabilité après mise à niveau.
- Six tests Playwright locaux : succès. Parcours de toutes les pages et des liens internes, H1 unique, métadonnées, canonicals, JSON-LD, sitemap et robots ; contrôles du responsive et d'accessibilité axe WCAG A/AA à 320, 390, 768 et 1440 px sur l'accueil, contact, service financier et avis ; menu mobile, fermeture par Échap, FAQ et formulaire sans requête d'envoi.
- Captures desktop et mobile inspectées visuellement. Les tests automatisés ne remplacent pas une revue complète avec technologies d'assistance ou appareils physiques.
- Six tests Playwright exécutés sur l’URL Vercel finale : succès (43,1 secondes), y compris toutes les pages, les liens et les quatre formats d’écran.
- Sur Vercel : accueil HTTP 200, image HTTP 200, URL inconnue HTTP 404, quatre redirections HTTP 301 vers `/contacto/#interest-form`, en-tête `X-Robots-Tag: noindex, nofollow` confirmé.
- Build Vercel réussi. Avertissement non bloquant émis par l'environnement Vercel/npm : option `cache-dir` inconnue. Aucun échec de compilation.
- Workflow GitHub Actions ajouté pour installation, build, audit et tests navigateur.

## À valider avant production

Validation éditoriale de la rédaction V2, des résumés de service et des mentions de couverture ; actualité des articles ; avis de confidentialité 2024, raison sociale et informations réglementaires à fournir si nécessaires ; droits des visuels et de la marque. Les archives du site contiennent des incohérences (numéros de téléphone, blocs de thème, garanties générales) : elles n'ont pas été considérées comme des preuves de validité actuelle de chaque affirmation.

Formspree : identifiant et destinataire vérifié, consentement final, protection antispam, traitement/conservation des données, politique de confidentialité adaptée et tests réels avant activation. Aucun formulaire sécurisé en production n'est prétendu livré à cette étape de démonstration.

Migration SEO : données Search Console et décision de conservation ou suppression des anciennes pages de thème, puis validation des redirections. Autorisation explicite nécessaire pour le déploiement sur le domaine officiel, la modification DNS et le retrait des trois protections d'indexation. Aucun service DatoCMS/Olivia activé.

## Fichiers principaux

- `src/pages/index.astro` : reprise de la page V2 et contenus.
- `src/components/{SEO,Footer,ContactForm}.astro`, `src/layouts/Page.astro` : éléments partagés.
- `src/pages/service/[slug].astro`, `src/pages/[slug].astro`, pages institutionnelles, `404.astro`, `robots.txt.ts`, `sitemap.xml.ts` : routes.
- `src/data/{services,posts,privacy}.json` : contenus sourcés.
- `src/lib/{site,integrations}.ts` : coordonnées et contrats optionnels.
- `public/styles.css`, `public/site.js`, `public/fonts.css`, `public/fonts/` : styles, interactions et polices locales.
- `astro.config.mjs`, `package.json`, `package-lock.json`, `vercel.json`, `.env.example` : build et déploiement.
- `tests/site.spec.ts`, `playwright.config.ts`, `.github/workflows/quality.yml` : vérifications.
- `docs/content-review.md`, `docs/url-inventory.md`, `docs/source/` : provenance et éléments à valider.
- `captures/`, `Preview-Interactiva.html`, `docs/reference/README-archive.md` : références originales, exclues du déploiement.
