# Testing

## Framework

- **Vitest** with `describe`/`it`/`expect` patterns
- Coverage via `@vitest/coverage-v8`

## File Conventions

| Type              | Location                  | Pattern                   |
| ----------------- | ------------------------- | ------------------------- |
| Unit tests        | `src/*.spec.ts`           | Alongside source files    |
| Integration tests | `src/__tests__/*.spec.ts` | In `__tests__/` directory |

## Vitest Configuration

Each package with tests has a `vitest.config.ts` using projects:

```typescript
projects: [
  {
    test: { name: "unit", include: ["src/**/*.spec.ts"], exclude: ["src/**/__tests__/*.spec.ts"] },
  },
  {
    test: {
      name: "integration",
      globalSetup: "@temporal-contract/testing/global-setup",
      include: ["src/**/__tests__/*.spec.ts"],
      testTimeout: 10_000,
    },
  },
];
```

## Integration Tests

- Require Docker (Temporal server via testcontainers)
- Use `@temporal-contract/testing` for global setup
- Run with `pnpm test:integration`

## Running Tests

```bash
pnpm test                    # All unit tests
pnpm test:integration        # All integration tests (needs Docker)
pnpm --filter ./packages/worker test  # Single package
```
