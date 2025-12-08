# Changesets

Ce projet utilise [Changesets](https://github.com/changesets/changesets) pour gérer les versions et les publications sur npm.

## Workflow de Release

### 1. Créer un changeset

Quand vous apportez une modification qui nécessite une nouvelle version :

```bash
pnpm changeset
```

Suivez les prompts pour :

- Sélectionner les packages affectés (tous les packages partagent la même version)
- Choisir le type de bump : `major`, `minor`, ou `patch`
- Décrire les changements

Cela crée un fichier dans `.changeset/` qui décrit les changements.

### 2. Commit et push

```bash
git add .
git commit -m "feat: your feature description"
git push
```

### 3. CI crée automatiquement une PR de release

La CI (workflow `release.yml`) détecte le nouveau changeset et crée automatiquement une **PR de version** qui :

- Met à jour les versions dans tous les `package.json`
- Génère/met à jour les `CHANGELOG.md`
- Groupe tous les changesets en attente

### 4. Review et merge la PR

Une fois la PR de version mergée dans `main`, la CI :

- Build tous les packages
- Publie automatiquement sur npm avec le `NPM_TOKEN`
- Crée un tag Git avec la version

## Configuration

- **Versions synchronisées** : Tous les packages (`@temporal-contract/*`) partagent le même numéro de version (configuré via `fixed` dans `.changeset/config.json`)
- **Access** : `public` (packages publiés publiquement sur npm)
- **Auto-publication** : Activée via le workflow `.github/workflows/release.yml`

## Secrets GitHub requis

Pour que la publication fonctionne, vous devez configurer dans les secrets GitHub :

- `NPM_TOKEN` : Token npm avec permission de publication (https://www.npmjs.com/settings/[username]/tokens)

## Scripts npm

- `pnpm changeset` : Créer un nouveau changeset
- `pnpm version` : Appliquer les changesets et bumper les versions (utilisé par CI)
- `pnpm release` : Build et publier sur npm (utilisé par CI)

## Type de versions

- **patch** (0.0.X) : Bug fixes, pas de breaking changes
- **minor** (0.X.0) : Nouvelles features, pas de breaking changes
- **major** (X.0.0) : Breaking changes

Tous les packages sont bumpés ensemble à la même version.
