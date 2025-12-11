# Boxed Order Processing Contract

This package contains the contract definition for the boxed order processing workflow.

## Purpose

This package is designed to be shared between:
- **Worker application**: Imports this package to implement workflows and activities
- **Client application**: Imports this package to consume the workflow from another application

## What's Different

This contract demonstrates the **Result/Future pattern** for explicit error handling, where activities return `Result<T, E>` instead of throwing exceptions.

## Architecture

```
┌─────────────────────────────────────┐
│   Contract Package (this package)   │
│   - Contract definition             │
│   - Domain schemas                  │
└─────────────────────────────────────┘
         ↑                    ↑
         │                    │
    ┌────┴────┐         ┌─────┴─────┐
    │ Worker  │         │  Client   │
    │ Package │         │  Package  │
    └─────────┘         └───────────┘
```

## What's included

- Contract definition with workflow and activity signatures
- Domain schemas (Order, PaymentResult, etc.)
- Additional `errorCode` field for better error tracking

## Usage

### In Worker Application

```typescript
import { boxedOrderContract } from '@temporal-contract/sample-boxed-order-processing-contract';
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';

// Implement the workflow with Result pattern
export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: boxedOrderContract,
  implementation: async (context, order) => {
    // ... implementation using Result pattern
  }
});
```

### In Client Application

```typescript
import { boxedOrderContract, Order } from '@temporal-contract/sample-boxed-order-processing-contract';
import { TypedClient } from '@temporal-contract/client';

// Create type-safe client
const client = TypedClient.create(boxedOrderContract, {
  connection,
  namespace: "default",
});

// Start workflow with full type safety
const handle = await client.startWorkflow("processOrder", {
  workflowId: order.orderId,
  args: order,
});
```

## Benefits

- **Separation of concerns**: Contract is independent of implementation
- **Reusability**: Can be imported by multiple applications
- **Type safety**: Full TypeScript support across boundaries
- **Explicit error handling**: Using Result/Future pattern
- **Versioning**: Contract can be versioned independently
