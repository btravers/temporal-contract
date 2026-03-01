# Order Processing Client Sample

> Standalone client sample demonstrating how to interact with the unified order processing contract

This sample demonstrates that a single client can interact with any worker implementation of the unified contract.

## Overview

This client package demonstrates that:

- The `order-processing-worker` implements the **unified contract**
- The client works with the worker implementation through the shared contract
- Workers handle errors internally using the Result/Future pattern with ActivityError

## Running the Sample

### Prerequisites

1. Start Temporal server:

```bash
temporal server start-dev
```

2. Build the workspace from the repository root:

```bash
cd ../..
pnpm install && pnpm build
```

### Running

1. Start the worker:

```bash
cd ../order-processing-worker
pnpm dev
```

2. Run the client:

```bash
cd ../order-processing-client
pnpm dev
```

## Testing

The client includes integration tests that verify:

- Workflow execution through the contract
- Proper input validation via contract schema
- Correct output types matching contract schema
- Workflow history and metadata access

Run tests:

```bash
pnpm test
```

## What to Notice

- **Same Contract**: The client uses `orderProcessingContract` from `@temporal-contract/sample-order-processing-contract`
- **Same Task Queue**: All workers listen on the same task queue: `"order-processing"`
- **Worker Agnostic**: The client doesn't know or care which worker implementation is running
- **Type Safety**: All inputs and outputs are validated against the contract schemas

## Key Concepts

### Unified Contract

The unified contract (`orderProcessingContract`) defines:

- Global activities: `log`, `sendNotification`
- Workflow: `processOrder`
  - Activities: `processPayment`, `reserveInventory`, `releaseInventory`, `createShipment`, `refundPayment`

### Worker Implementation

The worker (`examples/order-processing-worker`) uses `@temporal-contract/worker` with:

- Activities using the Result/Future pattern with ActivityError
- Clean Architecture with dependency injection
- Standalone TypeScript application

### Client Perspective

The client interacts with the worker through the shared contract, demonstrating the power of contract-driven development.

## License

MIT
