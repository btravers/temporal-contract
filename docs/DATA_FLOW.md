# Data Flow

This document explains how data flows through temporal-contract.

## High-Level Flow

```
┌─────────────┐
│   Contract  │  1. Define schemas with Zod
│ Definition  │     - Workflows
│             │     - Activities
└──────┬──────┘     - Input/Output types
       │
       ├───────────────────────────┐
       │                           │
       ▼                           ▼
┌─────────────┐            ┌─────────────┐
│   Worker    │            │   Client    │
│             │            │             │
│ 2. Implement│            │ 5. Execute  │
│    workflows│            │    workflows│
│    and      │            │             │
│    activities│           │             │
└──────┬──────┘            └──────┬──────┘
       │                           │
       │ 3. Start Worker           │ 6. Send request
       ▼                           ▼
┌─────────────────────────────────────┐
│         Temporal Server             │
│                                     │
│ 4. Queue workflows                  │
│ 7. Match with worker                │
│ 8. Execute workflow                 │
│ 9. Return result                    │
└─────────────────────────────────────┘
```

## Detailed Request Flow

### 1. Contract Definition (Shared)

```typescript
// contract.ts
import { z } from 'zod';
import { contract, workflow, activity } from '@temporal-contract/contract';

const myContract = contract({
  workflows: {
    processOrder: workflow({
      input: z.object({
        orderId: z.string(),
        amount: z.number(),
      }),
      output: z.object({
        status: z.enum(['success', 'failed']),
        transactionId: z.string().optional(),
      }),
      activities: {
        processPayment: activity({
          input: z.object({ amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        }),
      },
    }),
  },
});
```

### 2. Worker Implementation

```typescript
// worker.ts
import { createWorkflow, createActivity } from '@temporal-contract/worker';

// Implement activity
const processPayment = createActivity({
  definition: myContract.workflows.processOrder.activities!.processPayment,
  implementation: async (input) => {
    // 1. Input validated by Zod ✅
    // input: { amount: number }
    
    // 2. Execute business logic
    const transactionId = await paymentGateway.charge(input.amount);
    
    // 3. Return output
    return { transactionId };
    // 4. Output validated by Zod ✅
  },
});

// Implement workflow
const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  implementation: async (input, context) => {
    // 1. Input validated by Zod ✅
    // input: { orderId: string, amount: number }
    
    // 2. Call activities (typed!)
    const payment = await context.activities.processPayment({
      amount: input.amount,
    });
    // payment: { transactionId: string }
    
    // 3. Return output
    return {
      status: 'success',
      transactionId: payment.transactionId,
    };
    // 4. Output validated by Zod ✅
  },
});
```

### 3. Client Usage

```typescript
// client.ts
import { createClient } from '@temporal-contract/client';

const client = await createClient(myContract);

// Execute workflow
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  input: {
    orderId: 'ORD-123',
    amount: 99.99,
  },
  // Input validated by Zod ✅
});

// result: { status: 'success' | 'failed', transactionId?: string }
// Output validated by Zod ✅
// Full type inference! ✅
```

## Validation Points

```
Client                 Temporal Server            Worker
  │                           │                      │
  │ 1. Validate Input         │                      │
  │ ─────────────────────────>│                      │
  │    (Zod Schema)           │                      │
  │                           │                      │
  │                           │ 2. Queue Workflow    │
  │                           │ ────────────────────>│
  │                           │                      │
  │                           │                      │ 3. Validate Input
  │                           │                      │    (Zod Schema)
  │                           │                      │
  │                           │                      │ 4. Execute Workflow
  │                           │                      │
  │                           │                      │ 5. Call Activity
  │                           │                      │
  │                           │                      │ 6. Validate Activity Input
  │                           │                      │    (Zod Schema)
  │                           │                      │
  │                           │                      │ 7. Execute Activity
  │                           │                      │
  │                           │                      │ 8. Validate Activity Output
  │                           │                      │    (Zod Schema)
  │                           │                      │
  │                           │                      │ 9. Validate Workflow Output
  │                           │                      │    (Zod Schema)
  │                           │                      │
  │                           │ 10. Return Result    │
  │                           │ <────────────────────│
  │                           │                      │
  │ 11. Validate Output       │                      │
  │ <─────────────────────────│                      │
  │     (Zod Schema)          │                      │
  │                           │                      │
```

## Type Inference Flow

```typescript
// 1. Contract Definition
const contract = contract({
  workflows: {
    processOrder: workflow({
      input: z.object({ orderId: z.string() }),
      output: z.object({ status: z.string() }),
    }),
  },
});

// 2. Type Inference (Core)
type ProcessOrderInput = z.infer<typeof contract.workflows.processOrder.input>;
// => { orderId: string }

type ProcessOrderOutput = z.infer<typeof contract.workflows.processOrder.output>;
// => { status: string }

// 3. Worker Implementation (Worker)
const processOrder = createWorkflow({
  definition: contract.workflows.processOrder,
  implementation: async (input, context) => {
    // input is automatically typed as { orderId: string }
    // return type must be { status: string }
  },
});

// 4. Client Usage (Client)
const client = await createClient(contract);
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'test',
  taskQueue: 'orders',
  input: { orderId: 'ORD-123' }, // Typed as { orderId: string }
});
// result is automatically typed as { status: string }
```

## Error Handling Flow

```
Client                 Worker                  Activity
  │                      │                        │
  │ Execute Workflow     │                        │
  │ ──────────────────> │                        │
  │                      │                        │
  │                      │ Call Activity          │
  │                      │ ──────────────────────>│
  │                      │                        │
  │                      │                        │ ❌ Validation Error
  │                      │                        │    (Invalid Input)
  │                      │                        │
  │                      │ ZodError              │
  │                      │ <──────────────────────│
  │                      │                        │
  │                      │ ❌ Workflow Failed     │
  │                      │                        │
  │                      │                        │
  │ WorkflowFailedError │                        │
  │ <────────────────── │                        │
  │                      │                        │
```

## Activity Retry Flow

```
Workflow              Temporal Server           Activity
  │                         │                       │
  │ Call Activity           │                       │
  │ ──────────────────────> │ ──────────────────> │
  │                         │                       │
  │                         │                       │ ❌ Fails
  │                         │                       │
  │                         │ <──────────────────── │
  │                         │                       │
  │                         │ Wait (backoff)        │
  │                         │                       │
  │                         │ Retry                 │
  │                         │ ──────────────────────>│
  │                         │                       │
  │                         │                       │ ✅ Success
  │                         │                       │
  │ Result                  │ <──────────────────── │
  │ <────────────────────── │                       │
  │                         │                       │
```

## Summary

1. **Contract** defines schemas (shared between client and worker)
2. **Worker** implements workflows/activities with validation
3. **Client** calls workflows with validation
4. **Temporal Server** orchestrates execution
5. **Type inference** works end-to-end
6. **Validation** happens at every boundary
7. **Errors** are caught early with clear messages
