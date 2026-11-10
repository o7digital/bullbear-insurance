# Reprise du contenu d’origine — 10 novembre 2026

La migration précédente conservait les URL des 17 services mais résumait leurs contenus. Cette livraison reprend les textes métier complets tout en conservant la direction artistique Atelier V2.

## Périmètre vérifié

Les trois sitemaps WordPress de pages, services et articles recensent **45 URL** : **29 pages métier** et **16 pages de démonstration du thème**. L’inventaire de chaque URL est dans [sitemap-inventory.json](source/content-2026-11-10/sitemap-inventory.json).

Les 29 routes espagnoles sont disponibles dans les six langues, soit **174 routes** : accueil, présentation, contact, recrutement, confidentialité, index des articles, 17 services, deux articles et les quatre formulaires spécialisés. Les anciens résumés ont été remplacés par les paragraphes source ; la vision et l’offre de recrutement sont complètes. Les sources sont conservées dans [l’archive compressée](source/content-2026-11-10/pages.json.gz).

Le [registre de migration](source/content-2026-11-10/migration-audit.json) donne, pour chaque bloc WordPress, sa provenance, son contenu et son traitement : repris, représenté dans le header/footer ou le formulaire, doublon, décoration vide, ou contenu de démonstration exclu. Les blocs métier importés totalisent **605 blocs textuels** avant déduplication des chaînes partagées. Le catalogue éditorial comporte **504 textes uniques**, avec leurs cinq traductions supplémentaires.

## Hero approuvé et contenu d’origine

Le hero Atelier V2 visible dans les captures est conservé en première position : architecture, « Lo que importa / no se deja / al azar. », sous-titre et boutons d’origine, grande typographie Garamond et accent italique beige. Il ne doit pas être remplacé lors d’une reprise de contenu. Les thèmes cyber, médical et entreprise du site source sont ajoutés comme trois diapositives supplémentaires dans cette même direction artistique, avec leurs textes et destinations. Le carrousel ne défile pas automatiquement.

Sous le hero, l’accueil conserve l’ordre des blocs métier d’origine : présentation, comparatif d’offre, attention aux sinistres, analyse de risque, trois offres financières/bénéfices, assurances personnelles et devis, assurances d’entreprise et devis, contact, articles et partenaires. Le menu reprend les quatre catégories de produits. Les textes du hero approuvé et leurs traductions sont réactivés dans Directus ; les autres textes retirés restent archivés sans supprimer les modifications ni les brouillons.

La diapositive source composée uniquement de `slider_image1.jpg`, sans titre ni lien, n’est pas reproduite comme écran vide ; l’image reste dans les assets archivés et son empreinte reste vérifiée. Les tests contrôlent le hero architectural affiché au chargement, son texte formaté après aller-retour entre les diapositives, les trois thèmes supplémentaires, l’ordre des blocs, les produits et l’absence de recouvrement sur mobile dans les six langues. Le Studio garde le remplacement de l’image architecturale principale au prochain build ; les trois images source restent statiques.

## Documents et médias

Deux documents originaux sont servis localement avec liens de téléchargement dans les six langues :

- Présentation Insurance Broker 2023, depuis la page de présentation.
- Présentation des lignes financières, depuis la fiche Protector de capital privado.

Les **115 images/icônes accessibles** et les deux PDF sont copiés avec une empreinte SHA-256 et une vérification de taille. Les logos des assureurs, images des services, illustrations de recrutement et images des deux articles sont rétablis. Les fichiers PDF restent les documents originaux espagnols.

Une image appelée `Captura-de-Pantalla-2023-05-08-a-las-18.48.21.png` renvoie déjà HTTP 404 sur le site d’origine. Elle est signalée dans le registre, sans inventer de remplacement. Les logos des autres assureurs présents et accessibles sur le site source sont conservés.

## Formulaires

Les quatre anciennes redirections génériques sont supprimées au profit de leurs pages d’origine :

| Route | Choix conservés |
| --- | --- |
| `/formulario-danos/` | Corporativo, Infraestructura, Fabricación, Hotelería, Construcción, Aviación, PyMes, Marítimo, Logística |
| `/formulario-cuidado-de-personas/` | Gastos Médicos Mayores, Vida, Accidentes personales |
| `/formulario-automoviles/` | Prénom, nom, téléphone et email, comme le formulaire source |
| `/contacto-lineas-financieras/` | Cyber insurance, Institución de CP, D&O, Crime, Responsabilidad Civil |

Le formulaire général conserve Seguro Personal, Seguro empresarial et Protección de Capital privado. Les prénom/nom requis, le téléphone facultatif, l’email, les commentaires lorsqu’ils existent et le type choisi sont transmis jusqu’à Directus et visibles dans le Studio. Les noms techniques WordPress sont remplacés par des champs natifs ; aucune demande n’est envoyée à l’ancien WordPress. Consentement, honeypot, contrôle serveur et limitation des soumissions restent actifs. L’avis de confidentialité décrit ces champs et leur hébergement.

## Traitements explicites des anomalies source

- La route source `/reclutamiento/` renvoie HTTP 404 au moment du contrôle ; le contenu complet est récupéré depuis l’export de l’API publique WordPress du 9 novembre, et rétabli sur cette route.
- L’ancien site propose des liens vers un produit cyber identifié par `p=8856` et vers des pages d’assurance animaux qui renvoient HTTP 404. Leurs textes visibles sont conservés ; les demandes de devis pointent vers le formulaire fonctionnel correspondant.
- Les extraits répétés sur desktop/mobile ou les cartes répétant la page « Sobre nosotros » ne sont pas reproduits plusieurs fois : leur contenu complet est présent dans la page.
- Les avis anglophones factices, chiffres d’avis, faux membres d’équipe, numéro `55 1234 5678`, texte Lorem ipsum, pages et formulaires de démonstration du thème sont exclus. Leur présence et la raison de leur exclusion sont consignées dans le registre.
- Les coordonnées de contact sont conservées avec une ponctuation de téléphone normalisée et un lien de carte utilisable. Le design actuel et les URL des pages métier sont conservés ; aucune garantie supplémentaire n’est inventée.

## Vérification et gestion éditoriale

`npm run test:content` compare les textes retenus de chaque bloc source au HTML généré de la page correspondante. Il contrôle séparément tous les paragraphes des deux articles et de l’avis de confidentialité, les champs/choix des formulaires, chaque fichier importé et les liens PDF dans les six langues. `npm run test:cms` couvre les droits, traductions, brouillons, soumissions et la conservation des nouveaux champs. Les tests Playwright vérifient les routes, les liens internes, l’accessibilité, les formats d’écran et les formulaires spécialisés.

Les nouveaux textes sont importés dans le Directus existant. Les anciens textes retirés du frontend sont archivés après vérification de l’absence de modifications/brouillons à conserver. Les utilisateurs, rôles, demandes et identifiants existants ne sont pas remplacés. Le frontend reste sur Vercel et le Studio/Directus sur Railway.

Validation du hero restauré : 30 tests locaux réussis, build Node 24 / UTC avec Directus publié, et comparaison visuelle avec les captures du hero architectural. Le contrôle protège son texte formaté et son affichage initial tout en vérifiant les trois diapositives supplémentaires dans les six langues.
