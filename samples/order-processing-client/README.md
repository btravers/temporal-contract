# Order Processing Client Sample

> Standalone client sample demonstrating how to interact with the unified order processing contract

This sample demonstrates that a single client can interact with any worker implementation of the unified contract.

## Overview

This client package demonstrates that:
- Both `basic-order-processing-worker` and `boxed-order-processing-worker` workers implement the **same unified contract**
- A single client works with any worker implementation
- From the client's perspective, all workers are identical
- The only difference is in how workers handle errors internally (Promise-based vs. Result/Future pattern)

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

### Running with Any Worker

1. Start a worker (choose one):

**Option A: Basic Worker**
```bash
cd ../basic-order-processing-worker
pnpm dev:worker
```

**Option B: Boxed Worker**
```bash
cd ../boxed-order-processing-worker
pnpm dev:worker
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

- **Same Contract**: The client uses `orderProcessingContract` from `@temporal-contract/sample-basic-order-processing-contract`
- **Same Task Queue**: All workers listen on the same task queue: `"order-processing"`
- **Worker Agnostic**: The client doesn't know or care which worker implementation is running
- **Type Safety**: All inputs and outputs are validated against the contract schemas

## Key Concepts

### Unified Contract

The unified contract (`orderProcessingContract`) defines:
- Global activities: `log`, `sendNotification`
- Workflow: `processOrder`
  - Activities: `processPayment`, `reserveInventory`, `releaseInventory`, `createShipment`, `refundPayment`

### Worker Implementations

Both workers implement the exact same contract but with different patterns:

1. **Basic Worker** (`samples/basic-order-processing-worker`)
   - Uses `@temporal-contract/worker`
   - Promise-based activities
   - Traditional error handling with try/catch
   - Simpler to understand and implement

2. **Boxed Worker** (`samples/boxed-order-processing-worker`)
   - Uses `@temporal-contract/worker-boxed`
   - Result/Future pattern with `@swan-io/boxed`
   - Explicit error types in function signatures
   - Better type safety and functional composition

### Client Perspective

From the client's perspective, there's **no difference** between the workers:
- Same contract import
- Same workflow names
- Same activity signatures
- Same result types

This demonstrates the power of contract-driven development - implementations can vary while maintaining compatibility.

## License

MIT
