# Basic Order Processing Sample

> Standard Promise-based workflow with Clean Architecture

## What It Does

Processes orders through:
1. Payment processing 💳
2. Inventory reservation 📦
3. Shipment creation 📮
4. Customer notification 📧

With automatic rollback on failures.

## Architecture

**Clean Architecture** layers:

```
src/
├── domain/           # Business logic (pure)
├── infrastructure/   # Technical adapters
├── application/      # Temporal bindings
└── dependencies.ts   # DI container
```

## Running

### Prerequisites

1. Temporal Server:
   ```bash
   temporal server start-dev
   ```

2. From repo root:
   ```bash
   pnpm install && pnpm build
   ```

### Run

From this directory:

```bash
# Terminal 1: Worker
pnpm dev:worker

# Terminal 2: Client
pnpm dev:client
```

## What It Demonstrates

✅ Type-safe contracts with Zod  
✅ Clean Architecture (Domain → Infrastructure → Application)  
✅ Dependency injection for testability  
✅ Error handling with compensating actions  
✅ Workflow orchestration with Temporal

## Learn More

- [Main README](../../README.md)
- [Samples Overview](../README.md)
- [Worker Implementation Guide](../../docs/CONTRACT_HANDLER.md)
