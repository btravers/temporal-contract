# Order Processing Worker

> Type-safe order processing worker with Clean Architecture and Result/Future pattern

## Running

```bash
# Prerequisites: Temporal server running and packages built
temporal server start-dev

# Run from this directory
pnpm dev
```

## What It Demonstrates

- ✅ Type-safe contracts with Zod
- ✅ Result/Future pattern with ApplicationFailure for explicit error handling
- ✅ Clean Architecture (Domain → Infrastructure → Application)
- ✅ Dependency injection for testability
- ✅ Error handling with compensating actions

## Documentation

📖 **[Read the full documentation →](https://btravstack.github.io/temporal-contract)**

- [Example Overview](https://btravstack.github.io/temporal-contract/examples/basic-order-processing)
- [Getting Started](https://btravstack.github.io/temporal-contract/guide/getting-started)
- [All Examples](https://btravstack.github.io/temporal-contract/examples/)

## License

MIT
