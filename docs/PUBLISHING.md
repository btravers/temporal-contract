# Publishing Guide

This guide explains how to publish the temporal-contract packages to npm.

## Prerequisites

1. You must have npm account and be logged in:
```bash
npm login
```

2. You must be added as a maintainer to the `@temporal-contract` npm organization

3. All packages must be built:
```bash
pnpm build
```

## Publishing Process

### 1. Update Versions

Update the version in all `package.json` files:

```bash
# For a patch release (0.0.1 -> 0.0.2)
pnpm version patch -r

# For a minor release (0.0.1 -> 0.1.0)
pnpm version minor -r

# For a major release (0.0.1 -> 1.0.0)
pnpm version major -r
```

### 2. Update Changelog

Update `CHANGELOG.md` with the new version and changes.

### 3. Commit Changes

```bash
git add .
git commit -m "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

### 4. Build Packages

```bash
pnpm build
```

### 5. Publish to npm

Publish all packages in the correct order (core first, then others):

```bash
# Publish core first (no dependencies)
cd packages/core
npm publish --access public

# Publish contract (depends on core)
cd ../contract
npm publish --access public

# Publish worker (depends on core)
cd ../worker
npm publish --access public

# Publish client (depends on core)
cd ../client
npm publish --access public
```

### 6. Verify Publication

Check that all packages are available:

```bash
npm info @temporal-contract/core
npm info @temporal-contract/contract
npm info @temporal-contract/worker
npm info @temporal-contract/client
```

## Automated Publishing (Future)

We plan to automate this process with GitHub Actions:

1. Create a new release on GitHub
2. GitHub Actions runs tests
3. GitHub Actions builds packages
4. GitHub Actions publishes to npm
5. GitHub Actions creates release notes

## Publishing Checklist

- [ ] All tests pass: `pnpm test`
- [ ] All packages build: `pnpm build`
- [ ] Version updated in all packages
- [ ] CHANGELOG.md updated
- [ ] Changes committed and tagged
- [ ] Core package published
- [ ] Contract package published
- [ ] Worker package published
- [ ] Client package published
- [ ] GitHub release created
- [ ] Documentation updated

## Troubleshooting

### "You do not have permission to publish"

Make sure you're logged in and have access to the `@temporal-contract` organization:

```bash
npm login
npm access ls-packages @temporal-contract
```

### "Cannot publish over existing version"

You need to bump the version number first.

### "Package not found after publishing"

Wait a few minutes - npm needs time to process the publication.

## Beta Releases

For beta releases, use the `beta` tag:

```bash
npm version prerelease --preid=beta
npm publish --tag beta --access public
```

Users can install with:

```bash
npm install @temporal-contract/core@beta
```
