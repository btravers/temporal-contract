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

See how easy it is to get started:

::: code-group

```typescript [contract.ts]
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

export const orderContract = defineContract({
  taskQueue: 'orders',
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ status: z.enum(['success', 'failed']) }),
      activities: {
        processPayment: {
          input: z.object({ amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        },
      },
    },
  },
});
```

```typescript [workflow.ts]
import { declareWorkflow } from '@temporal-contract/worker/workflow';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, { orderId }) => {
    const payment = await context.activities.processPayment({
      amount: 100
    });
    return { status: 'success' };
  },
});
```

```typescript [client.ts]
import { TypedClient } from '@temporal-contract/client';

const client = TypedClient.create(orderContract, { connection });

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123' },
});

console.log(result.status); // ✅ Fully typed!
```

:::
