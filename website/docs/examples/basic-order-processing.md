# Basic Order Processing

A complete e-commerce order processing workflow example demonstrating contract separation.

## Overview

This example demonstrates:
- **Separated contract package**: Contract is in its own package that can be shared
- Order validation
- Payment processing
- Inventory management
- Email notifications
- Clean Architecture structure

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
└── order-processing-worker/             # Worker/Client implementation
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
- Provides full TypeScript type safety across all boundaries
- Can be versioned and published independently

### Worker Application

The worker application imports the contract package and implements:
- Activities that match the contract signatures
- Workflows that use the contract's type definitions
- Worker setup that registers the implementations

## Source Code

View the complete source code:
- [Contract package](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-contract)
- [Worker/Client application](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-worker)

## Running the Example

```bash
# Build the contract package first
cd samples/order-processing-contract
pnpm build

# Run the worker and client
cd ../order-processing-worker
pnpm dev:worker  # Terminal 1 - Start worker
pnpm dev:client  # Terminal 2 - Run client
```

## Benefits of This Architecture

1. **Contract Reusability**: The contract can be imported by multiple applications
2. **Type Safety**: Full TypeScript support across all boundaries
3. **Independent Deployment**: Client and worker can be in different repositories
4. **Clear Separation**: Contract definition is separate from implementation

See [Examples Overview](/examples/) for more details.
