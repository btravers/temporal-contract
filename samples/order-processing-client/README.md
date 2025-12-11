# Order Processing Client Sample

> Standalone client sample demonstrating how to interact with the unified order processing contract

This sample demonstrates how a client application can interact with workers implementing the same contract but with different internal implementations (basic vs. boxed).

## Overview

This client package demonstrates that:
- Both `basic-order-processing` and `boxed-order-processing` workers implement the **same unified contract**
- From the client's perspective, both workers are identical
- The only difference is in how they handle errors internally (Promise-based vs. Result/Future pattern)

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

### Option A: Using the Basic Worker

1. Start the basic worker (in a separate terminal):
```bash
cd ../basic-order-processing
pnpm dev:worker
```

2. Run the basic client:
```bash
cd ../order-processing-client
pnpm dev:basic
```

### Option B: Using the Boxed Worker

1. Start the boxed worker (in a separate terminal):
```bash
cd ../boxed-order-processing
pnpm dev:worker
```

2. Run the boxed client:
```bash
cd ../order-processing-client
pnpm dev:boxed
```

## What to Notice

- **Same Contract**: Both clients use `orderProcessingContract` from `@temporal-contract/sample-basic-order-processing-contract`
- **Same Task Queue**: Both workers listen on the same task queue: `"order-processing"`
- **Identical Client Code**: The client code is nearly identical - the only difference is in the workflow IDs and logging messages
- **Different Error Handling**: The difference is internal to the workers:
  - Basic worker: Traditional Promise-based activities with try/catch
  - Boxed worker: Result/Future pattern with explicit error types

## Key Concepts

### Unified Contract

The unified contract (`orderProcessingContract`) defines:
- Global activities: `log`, `sendNotification`
- Workflow: `processOrder`
  - Activities: `processPayment`, `reserveInventory`, `releaseInventory`, `createShipment`, `refundPayment`

### Worker Implementations

Both workers implement the exact same contract but with different patterns:

1. **Basic Worker** (`samples/basic-order-processing`)
   - Uses `@temporal-contract/worker`
   - Promise-based activities
   - Traditional error handling with try/catch
   - Simpler to understand and implement

2. **Boxed Worker** (`samples/boxed-order-processing`)
   - Uses `@temporal-contract/worker-boxed`
   - Result/Future pattern with `@swan-io/boxed`
   - Explicit error types in function signatures
   - Better type safety and functional composition

### Client Perspective

From the client's perspective, there's **no difference** between the two workers:
- Same contract import
- Same workflow names
- Same activity signatures
- Same result types

This demonstrates the power of contract-driven development - implementations can vary while maintaining compatibility.

## License

MIT
