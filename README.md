# temporal-contract

> **Type-safe contracts for Temporal.io** — End-to-end type safety and automatic validation for workflows and activities

[![CI](https://github.com/btravers/temporal-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/btravers/temporal-contract/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@temporal-contract/contract.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/contract)
[![npm downloads](https://img.shields.io/npm/dm/@temporal-contract/contract.svg)](https://www.npmjs.com/package/@temporal-contract/contract)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

## What You Get

✅ **End-to-end type safety** — From contract to client, workflows, and activities  
✅ **Automatic validation** — Zod schemas validate at all network boundaries  
✅ **Compile-time checks** — TypeScript catches missing or incorrect implementations  
✅ **Better DX** — Autocomplete, refactoring support, inline documentation

## Quick Start

### Installation

```bash
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
pnpm add zod @temporalio/client @temporalio/worker @temporalio/workflow
```

### Usage in 3 Steps

#### 1. Define Your Contract

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

export const orderContract = defineContract({
  taskQueue: 'orders',

  activities: {
    sendEmail: {
      input: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
      output: z.object({ sent: z.boolean() }),
    },
  },

  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string(), customerId: z.string() }),
      output: z.object({ status: z.enum(['success', 'failed']), transactionId: z.string() }),

      activities: {
        processPayment: {
          input: z.object({ customerId: z.string(), amount: z.number() }),
          output: z.object({ transactionId: z.string(), success: z.boolean() }),
        },
      },
    },
  },
});
```

#### 2. Implement Activities & Workflows

```typescript
// activities.ts
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    sendEmail: async ({ to, subject, body }) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },
    processPayment: async ({ customerId, amount }) => {
      const txId = await paymentGateway.charge(customerId, amount);
      return { transactionId: txId, success: true };
    },
  },
});

// workflows.ts
import { declareWorkflow } from '@temporal-contract/worker/workflow';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, { orderId, customerId }) => {
    const payment = await context.activities.processPayment({
      customerId,
      amount: 100
    });

    await context.activities.sendEmail({
      to: customerId,
      subject: 'Order Confirmed',
      body: `Order ${orderId} processed`,
    });

    return {
      status: payment.success ? 'success' : 'failed',
      transactionId: payment.transactionId,
    };
  },
});
```

#### 3. Start Worker & Call from Client

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import { activities } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activities.activities,
  taskQueue: activities.contract.taskQueue,
});

await worker.run();

// client.ts
import { TypedClient } from '@temporal-contract/client';
import { Connection } from '@temporalio/client';

const connection = await Connection.connect({ address: 'localhost:7233' });
const client = TypedClient.create(orderContract, { connection });

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});

console.log(result.status);  // 'success' | 'failed' — fully typed!
```

---

## Key Features

### Contract-First Design

Define your workflow interface once with Zod schemas — types and validation flow from there.

### Automatic Validation

All inputs and outputs are validated automatically at network boundaries (workflow entry/exit, activity calls).

### Type Inference

Full TypeScript inference from contract to implementation — no manual type annotations needed.

### Compile-Time Safety

TypeScript catches missing implementations, wrong types, and mismatched activity names before runtime.

---

## Packages

| Package                                                      | Description                                           |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| [`@temporal-contract/contract`](./packages/contract)         | Contract builder and type definitions                 |
| [`@temporal-contract/worker`](./packages/worker)             | Type-safe worker with automatic validation            |
| [`@temporal-contract/worker-boxed`](./packages/worker-boxed) | Worker with Result/Future pattern for explicit errors |
| [`@temporal-contract/client`](./packages/client)             | Type-safe client for consuming workflows              |

---

## Examples

Explore complete working examples in [`samples/`](./samples):

- **[basic-order-processing](./samples/basic-order-processing)** — Standard Promise-based workflow with Clean Architecture
- **[boxed-order-processing](./samples/boxed-order-processing)** — Result/Future pattern for explicit error handling

---

## Documentation

**Guides:**

- [Worker Implementation Guide](./docs/CONTRACT_HANDLER.md) — Complete guide to implementing workers
- [Entry Points Architecture](./docs/ENTRY_POINTS.md) — Separate entry points for activities/workflows
- [Activity Handler Types](./docs/ACTIVITY_HANDLERS.md) — Type utilities for cleaner implementations

**Project:**

- [Contributing](./docs/CONTRIBUTING.md) — How to contribute
- [Changesets](./docs/CHANGESETS.md) — Release process
- [Roadmap](./docs/ROADMAP.md) — Future plans

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check
pnpm typecheck

# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format
```

### Release Process

This project uses [Changesets](https://github.com/changesets/changesets):

1. Make changes and run `pnpm changeset`
2. Push to GitHub
3. CI creates a "Version Packages" PR
4. Merge to publish to npm

See [CHANGESETS.md](./docs/CHANGESETS.md) for details.

---

## License

MIT

---

## Related

- [Temporal.io](https://temporal.io/) — Durable workflow engine
- [Zod](https://zod.dev/) — TypeScript-first schema validation
