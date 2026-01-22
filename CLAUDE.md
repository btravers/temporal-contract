# Claude Code Instructions

## Project Overview

**temporal-contract** is a type-safe contract system for Temporal.io workflows and activities, built as a TypeScript monorepo.

## Repository Structure

```
packages/           # Core library packages
  contract/         # Contract builder and type definitions
  worker/           # Type-safe worker with validation
  client/           # Type-safe client for consuming workflows
  boxed/            # Result and Future types for error handling
  testing/          # Testing utilities
  worker-nestjs/    # NestJS integration for workers
  client-nestjs/    # NestJS integration for clients
examples/           # Working examples (order-processing-*)
tools/              # Shared configurations (tsconfig, typedoc)
docs/               # VitePress documentation website
```

## Common Commands

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm test           # Run unit tests
pnpm test:integration  # Run integration tests (requires Docker)
pnpm typecheck      # Type check all packages
pnpm lint           # Run oxlint
pnpm format         # Format with oxfmt
pnpm format --check # Check formatting
pnpm knip           # Check for unused exports/dependencies
```

## Code Style

- Use `.js` extensions in imports (even for TypeScript files)
- Use `Result<T, E>` pattern instead of throwing exceptions
- Never use `any` type - use `unknown` instead
- Use Zod for schema validation
- Use workspace protocol for internal dependencies: `"workspace:*"`
- Tests go alongside source files as `*.spec.ts`

## TypeScript Configuration

All packages extend `@temporal-contract/tsconfig/base.json` which includes strict settings.

## Testing

- Unit tests: `pnpm test`
- Integration tests require Docker for Temporal server: `pnpm test:integration`
- Use `@temporal-contract/testing` utilities for integration tests
- Tests use Vitest with `describe`/`it`/`expect` patterns

## Pre-Commit Checks

Lefthook runs automatically on commit:

- Format staged files (oxfmt)
- Lint staged files (oxlint)
- Sort package.json files
- Validate commit message format (Conventional Commits)
