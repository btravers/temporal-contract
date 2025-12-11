# Order Processing Contract

This package contains the contract definition for the order processing workflow.

## Purpose

This package is designed to be shared between:
- **Worker application**: Imports this package to implement workflows and activities
- **Client application**: Imports this package to consume the workflow from another application

## Architecture

```
┌─────────────────────────────────────┐
│   Contract Package (this package)  │
│   - Contract definition             │
│   - Domain schemas                  │
│   - Type definitions                │
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
- TypeScript type definitions

## Usage

### In Worker Application

```typescript
import { orderProcessingContract } from '@temporal-contract/sample-basic-order-processing-contract';
import { declareWorkflow } from '@temporal-contract/worker/workflow';

// Implement the workflow
export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderProcessingContract,
  implementation: async (context, order) => {
    // ... implementation
  }
});
```

### In Client Application

```typescript
import { orderProcessingContract, Order } from '@temporal-contract/sample-basic-order-processing-contract';
import { TypedClient } from '@temporal-contract/client';

// Create type-safe client
const client = TypedClient.create(orderProcessingContract, {
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
- **Versioning**: Contract can be versioned independently
