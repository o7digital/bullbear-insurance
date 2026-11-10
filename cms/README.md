# Bull & Bear Studio

Le projet Railway `bullbear-insurance-cms` contient PostgreSQL 18, Directus 12.6.1 et un Studio Node 24 indépendant. Les coordonnées non sensibles sont dans `deployment.json`.

## Accès

Studio : https://studio-production-2fc1.up.railway.app/ ; administration technique : https://directus-production-1a26.up.railway.app/admin.

Le compte initial est `olivier.steineur@icloud.com`. Son mot de passe initial est la variable **ADMIN_PASSWORD du service directus** dans Railway. Il n'est enregistré dans aucun fichier du dépôt. Modifier ce mot de passe dans le profil Directus après récupération ; une modification de la variable de bootstrap ne change pas un compte déjà créé. Le Studio accepte actuellement les administrateurs Directus. Les tokens techniques de lecture/création n'ont aucun accès au Studio. Un rôle éditorial pourra être configuré avec l'adresse du client et des permissions explicites.

## Usage

1. Choisir Páginas, Soluciones ou Artículos, puis la page.
2. Modifier les textes espagnols. Les titres formatés sont présentés visuellement.
3. « Guardar y traducir » prépare un brouillon et les cinq traductions. Une erreur de traduction n'écrit aucun bundle partiel.
4. Relire les traductions dans Idiomas. « Descartar borrador » rétablit les valeurs publiées.
5. « Publicar cambios » contrôle les six langues puis déclenche Vercel sur la branche de travail. Vérifier la réussite du build avant d'annoncer la mise en ligne.

Les images (logo/portada) enregistrées dans Identidad e imágenes sont incluses au prochain build. Les soumissions du formulaire apparaissent dans Solicitudes : suivi, notes internes et suppression. Aucun envoi de notification email n'est configuré. Le Studio utilise le fournisseur de traduction déjà employé dans Nathalie Studio, avec une copie de sa clé conservée uniquement dans Railway.

## Collections

- `site_texts` : 406 textes × 6 langues ; source stable, valeur publiée, brouillon et empreinte de la source traduite.
- `site_media` : logo officiel et illustration architecturale.
- `inquiries` : nom, email, domaine d'intérêt, langue, consentement, version de l'avis, date, statut et notes.

Le frontend ne reçoit que le HTML, les images publiques du build et les messages de validation. Les secrets et les demandes restent côté serveur. Le compte Website build lit les collections de contenu et fichiers ; le compte Website contact a seulement le droit de création sur inquiries. Les autorisations anonymes Directus ne sont pas ouvertes. La licence Core permet ici les permissions par collection ; le choix des fiches publiées et des champs lus est appliqué dans le loader serveur.

## Bootstrap et maintenance

Depuis ce dépôt lié au projet Railway :

```sh
railway run --no-local --service directus -- node cms/bootstrap.mjs
```

Le bootstrap ajoute les collections et données manquantes, conserve les textes modifiés et met à jour leur classement éditorial. Ne pas le réexécuter pour restaurer un élément volontairement supprimé. Le catalogue initial est généré par `CONTENT_INVENTORY_ONLY=true npm run build` et traduit par `node cms/translate-seed.mjs` avec la clé dans l'environnement ; aucun secret ne doit être ajouté aux fichiers.

Tests serveur : `npm run test:cms`. Contrôle réel du Studio : `railway run --no-local --service directus -- node cms/studio/browser-check.mjs`. Ce contrôle crée puis abandonne un brouillon sur le texte Comparar et ne publie rien. Les tests automatisés utilisent Chromium ; la consultation humaine des liens se fait dans Firefox.

Le Studio se déploie via le CLI Railway avec `railway up cms --path-as-root --service studio --detach`. Le Dockerfile ne copie pas les scripts de bootstrap ni les exports source. Après succès, vérifier `/health`, la connexion et les écrans.

## Persistance et sauvegardes

Volumes séparés pour `/var/lib/postgresql/data` et `/directus/uploads`. Les sauvegardes Railway quotidiennes et hebdomadaires sont activées pour les deux volumes. La restauration n'a pas été exercée pendant cette livraison. Ne pas supprimer la base ni les uploads lors d'un redéploiement. Les variables Railway contiennent le secret Directus, les comptes techniques, le secret de session, le fournisseur de traduction et le hook Vercel. Les variables Preview de Vercel sont limitées à la branche `feat/atelier-v2-preview`.

Les historiques de publication Vercel permettent de retrouver le dernier déploiement réussi. Les versions de contenu et l'activité Directus permettent de retracer les modifications. La durée de conservation des demandes doit être gérée par le propriétaire dans Solicitudes/Directus ; aucune purge automatique n'est configurée.
