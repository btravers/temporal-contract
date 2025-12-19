---
layout: home

hero:
  name: "temporal-contract"
  text: "Type-safe contracts for Temporal.io"
  tagline: End-to-end type safety and automatic validation for workflows and activities
  image:
    src: /logo.svg
    alt: temporal-contract
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/btravers/temporal-contract
    - theme: alt
      text: Examples
      link: /examples/

features:
  - icon: 🔒
    title: End-to-end Type Safety
    details: Full TypeScript inference from contract to client, workflows, and activities. No manual type annotations needed.
  
  - icon: ✅
    title: Automatic Validation
    details: Zod schemas validate all inputs and outputs at network boundaries automatically. No runtime surprises.
  
  - icon: 🛠️
    title: Compile-time Checks
    details: TypeScript catches missing or incorrect implementations before runtime. Refactor with confidence.
  
  - icon: 🚀
    title: Better Developer Experience
    details: Full autocomplete, inline documentation, and refactoring support throughout your codebase.
  
  - icon: 📝
    title: Contract-First Design
    details: Define your workflow interface once with Zod schemas — types and validation flow from there.
  
  - icon: 🎯
    title: Explicit Error Handling
    details: Optional Result/Future pattern for workflows that need explicit error handling without exceptions.

  - icon: 🔄
    title: Child Workflow Support
    details: Execute child workflows with type-safe Result/Future pattern, including cross-contract workflows for microservice orchestration.
  
  - icon: 🧪
    title: Testing Utilities
    details: Built-in testing support with testcontainers integration and type-safe mocks for workflows and activities.
---

## The Problem

Working with [Temporal.io](https://temporal.io/) workflows is powerful, but comes with challenges:

```typescript
// ❌ No type safety
const result = await client.workflow.execute('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  args: [{ orderId: 'ORD-123' }],  // What fields? What types?
});

console.log(result.status);  // unknown type, no autocomplete

// ❌ Manual validation everywhere
// ❌ Runtime errors from wrong data
// ❌ Scattered activity definitions
```

## How It Works

```mermaid
graph LR
    A[Contract Definition] --> B[Worker]
    A --> C[Client]
    B --> D[Type-safe Activities]
    B --> E[Type-safe Workflows]
    C --> F[Type-safe Calls]

    style A fill:#3b82f6,stroke:#1e40af,color:#fff
    style B fill:#10b981,stroke:#059669,color:#fff
    style C fill:#8b5cf6,stroke:#6d28d9,color:#fff
```

## The Solution

**temporal-contract** transforms your Temporal workflows with a contract-first approach:

```typescript
// ✅ Define once
const contract = defineContract({
  taskQueue: 'orders',
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string(), customerId: z.string() }),
      output: z.object({ status: z.enum(['success', 'failed']), transactionId: z.string() }),
      activities: { /* ... */ }
    }
  }
});

// ✅ Type-safe client
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },  // TypeScript knows!
});

console.log(result.status);  // 'success' | 'failed' — full autocomplete!
```

## Quick Example

See how easy it is to get started with a complete workflow:

::: code-group

```typescript [1. contract.ts]
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

// ✅ Define your contract once
export const orderContract = defineContract({
  taskQueue: 'orders',
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string(),
        customerId: z.string(),
        amount: z.number()
      }),
      output: z.object({
        status: z.enum(['success', 'failed']),
        transactionId: z.string().optional()
      }),
      activities: {
        processPayment: {
          input: z.object({
            customerId: z.string(),
            amount: z.number()
          }),
          output: z.object({ transactionId: z.string() }),
        },
        sendNotification: {
          input: z.object({
            customerId: z.string(),
            message: z.string()
          }),
          output: z.void(),
        },
      },
    },
  },
});
```

```typescript [2. activities.ts]
import { Future, Result } from '@temporal-contract/boxed';
import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker/activity';
import { orderContract } from './contract';

// ✅ Implement activities with full type safety
export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    processOrder: {
      processPayment: ({ customerId, amount }) => {
        // Your payment service implementation
        return Future.fromPromise(
          paymentService.charge(customerId, amount)
        ).mapOk((transaction) => ({ transactionId: transaction.id }))
          .mapError((error) =>
            new ActivityError(
              'PAYMENT_FAILED',
              error instanceof Error ? error.message : 'Payment processing failed',
              error
            )
          );
      },

      sendNotification: ({ customerId, message }) => {
        // Your notification service implementation
        return Future.fromPromise(
          notificationService.send(customerId, message)
        ).mapError((error) =>
          new ActivityError(
            'NOTIFICATION_FAILED',
            error instanceof Error ? error.message : 'Failed to send notification',
            error
          )
        );
      },
    },
  },
});
```

```typescript [3. workflow.ts]
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { orderContract } from './contract';

// ✅ Type-safe workflow orchestration
export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, { orderId, customerId, amount }) => {
    // Activities are fully typed!
    const { transactionId } = await context.activities.processPayment({
      customerId,
      amount,
    });

    await context.activities.sendNotification({
      customerId,
      message: `Order ${orderId} confirmed!`,
    });

    return { status: 'success', transactionId };
  },
});
```

```typescript [4. worker.ts]
import { NativeConnection } from '@temporalio/worker';
import { createWorker } from '@temporal-contract/worker/worker';
import { orderContract } from './contract';
import { activities } from './activities';

// ✅ Start the worker
const connection = await NativeConnection.connect({
  address: 'localhost:7233',
});

const worker = await createWorker({
  contract: orderContract,
  connection,
  namespace: 'default',
  workflowsPath: './workflows',
  activities,
});

await worker.run(); // Worker is now listening!
```

```typescript [5. client.ts]
import { TypedClient } from '@temporal-contract/client';
import { orderContract } from './contract';

// ✅ Type-safe client calls
const client = TypedClient.create(orderContract, { connection });

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 'ORD-123',
    customerId: 'CUST-456',
    amount: 99.99,
  },
});

// Full autocomplete on result!
console.log(result.status); // 'success' | 'failed'
console.log(result.transactionId); // string | undefined
```

:::

## What You Get

With temporal-contract, you get a complete, type-safe workflow system:

1. **Contract Definition** - Define your workflow interface once with Zod schemas
2. **Activity Implementation** - Implement business logic with full type safety
3. **Workflow Orchestration** - Coordinate activities with typed context
4. **Worker Setup** - Register activities and workflows automatically
5. **Type-safe Client** - Call workflows with autocomplete and validation

All parts work together seamlessly with end-to-end type safety!
