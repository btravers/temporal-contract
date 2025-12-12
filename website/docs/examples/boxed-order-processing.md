# Boxed Order Processing

Order processing with Result/Future pattern for explicit error handling, demonstrating contract separation.

## Overview

This example demonstrates:
- **Separated contract package**: Contract is in its own package that can be shared
- Type-safe error handling with Result<T, E>
- Non-throwing async operations with Future<T, E>
- Explicit error propagation
- Railway-oriented programming

## Project Structure

The example consists of two packages:

```
samples/
├── order-processing-contract/    # Contract package (shared)
│   ├── src/
│   │   ├── contract.ts                 # Contract definition
│   │   ├── schemas.ts                  # Domain schemas
│   │   └── index.ts                    # Package exports
│   └── package.json
│
└── order-processing-worker-boxed/             # Worker/Client implementation
    ├── src/
    │   ├── application/
    │   │   ├── activities.ts           # Activity implementations
    │   │   ├── workflows.ts            # Workflow implementations
    │   │   ├── worker.ts               # Worker setup
    │   │   └── client.ts               # Client example
    │   ├── domain/                     # Business logic
    │   └── infrastructure/             # External adapters
    └── package.json                    # Imports contract package
```

## Key Concepts

### Contract Package

The contract is separated into its own package (`order-processing-contract`) which:
- Can be imported by the worker to implement workflows/activities
- Can be imported by clients (even in other applications) to consume the workflow
- Provides full TypeScript type safety with Result/Future pattern
- Can be versioned and published independently

### Result/Future Pattern

This example uses `@swan-io/boxed` for explicit error handling:
- Activities return `Result<T, E>` instead of throwing
- Workflows use `Future<T, E>` for composable async operations
- Errors are part of the type signature

## Source Code

View the complete source code:
- [Contract package](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-contract)
- [Worker/Client application](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-worker-boxed)

## Running the Example

```bash
# Build the contract package first
cd samples/order-processing-contract
pnpm build

# Run the worker and client
cd ../order-processing-worker-boxed
pnpm dev:worker  # Terminal 1 - Start worker
pnpm dev:client  # Terminal 2 - Run client
```

## Benefits of This Architecture

1. **Contract Reusability**: The contract can be imported by multiple applications
2. **Explicit Error Handling**: Errors are part of the type system
3. **Type Safety**: Full TypeScript support with Result/Future types
4. **Independent Deployment**: Client and worker can be in different repositories

See [Result Pattern Guide](/guide/result-pattern) for more details.
