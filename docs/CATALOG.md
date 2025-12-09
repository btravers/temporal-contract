# PNPM Catalog Usage

This project uses the [pnpm catalog](https://pnpm.io/catalogs) feature to manage dependency versions centrally.

## What is pnpm catalog?

The pnpm catalog allows you to define dependency versions in one place (`pnpm-workspace.yaml`) and reference them in all `package.json` files using the `"catalog:"` syntax.

## Benefits

- ✅ **Single version** - One source of truth for each dependency version
- ✅ **Consistency** - All dependencies use the same version across the monorepo
- ✅ **Easy maintenance** - Update one line to upgrade a dependency everywhere
- ✅ **Fewer conflicts** - Reduces version conflicts between packages

## Structure

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"

catalog:
  # TypeScript and tooling
  typescript: 5.9.3
  "@types/node": 24.10.1
  turbo: 2.6.3
  vitest: 4.0.15
  ts-node: 10.9.2

  # Temporal.io
  "@temporalio/client": 1.13.2
  "@temporalio/worker": 1.13.2
  "@temporalio/workflow": 1.13.2

  # Logging
  pino: 10.1.0
  pino-pretty: 13.1.3

  # Build tools
  tsdown: 0.17.0

  # Linting & formatting
  oxlint: 1.31.0
  oxfmt: 0.16.0
  lefthook: 2.0.8

  # Validation
  zod: 4.1.13

  # Testing
  testcontainers: 11.9.0
```

### package.json

Instead of specifying versions directly:

```json
{
  "devDependencies": {
    "typescript": "^5.9.3",
    "zod": "^4.1.13"
  }
}
```

Use `catalog:`:

```json
{
  "devDependencies": {
    "typescript": "catalog:",
    "zod": "catalog:"
  }
}
```

## Adding a New Dependency

### 1. Add to catalog

Edit `pnpm-workspace.yaml`:

```yaml
catalog:
  # ... existing dependencies
  my-new-package: 1.0.0
```

### 2. Reference in a package

In the package's `package.json`:

```json
{
  "dependencies": {
    "my-new-package": "catalog:"
  }
}
```

### 3. Install

```bash
pnpm install
```

## Updating a Dependency

To update a dependency across the entire monorepo:

### 1. Modify the version in the catalog

Edit `pnpm-workspace.yaml`:

```yaml
catalog:
  typescript: 5.10.0  # Updated from 5.9.3 to 5.10.0
```

### 2. Reinstall

```bash
pnpm install
```

All packages using `typescript: "catalog:"` will be automatically updated.

## Package-Specific Dependencies

If a package needs a specific version different from the catalog, you can still specify it directly:

```json
{
  "dependencies": {
    "typescript": "catalog:",       // Uses catalog version
    "my-special-lib": "^2.0.0"     // Specific version
  }
}
```

## Useful Commands

### List catalog dependencies

```bash
cat pnpm-workspace.yaml | grep -A 100 "catalog:"
```

### Check installed versions

```bash
pnpm list typescript
pnpm list zod
```

### Update all dependencies

```bash
# 1. Update versions in pnpm-workspace.yaml
# 2. Then:
pnpm install
pnpm build
```

## References

- [Official pnpm Catalogs documentation](https://pnpm.io/catalogs)
- [pnpm Catalogs RFC](https://github.com/pnpm/rfcs/blob/main/text/0003-workspace-catalogs.md)
