# Commands

## Development

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages (Turborepo)
pnpm dev              # Watch mode for all packages
```

## Quality

```bash
pnpm lint             # Run oxlint
pnpm format           # Format with oxfmt (import sorting)
pnpm format --check   # Check formatting without fixing
pnpm typecheck        # Type-check all packages
pnpm knip             # Detect unused exports/dependencies
```

## Testing

```bash
pnpm test                    # Run unit tests (Vitest)
pnpm test:integration        # Run integration tests (requires Docker)
```

## Versioning & Release

```bash
pnpm changeset        # Create a changeset
pnpm version          # Apply changesets and bump versions
pnpm release          # Build and publish to npm
```
