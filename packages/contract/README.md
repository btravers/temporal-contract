# @temporal-contract/contract

> Contract builder and type definitions for Temporal workflows and activities

**Core package** for defining type-safe contracts with Zod schemas.

## Installation

```bash
pnpm add @temporal-contract/contract zod
```

## What's Included

- **Contract builder** — `defineContract()` for creating type-safe contracts
- **Type utilities** — Helper types for cleaner implementations
- **Helper functions** — Optional helpers for standalone definitions

## Usage

```typescript
import { z } from 'zod';
import { defineContract } from '@temporal-contract/contract';

export const myContract = defineContract({
  taskQueue: 'my-service',
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string(),
        items: z.array(z.object({
          productId: z.string(),
          quantity: z.number(),
        })),
      }),
      output: z.object({
        status: z.enum(['success', 'failed']),
        totalAmount: z.number(),
      }),
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

## Quick Start

### Define a Contract

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

export const myContract = defineContract({
  taskQueue: 'my-service',

  // Global activities (available in all workflows)
  activities: {
    sendEmail: {
      input: z.object({ to: z.string(), subject: z.string() }),
      output: z.object({ sent: z.boolean() }),
    },
  },

  // Workflows
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ status: z.string() }),

      // Workflow-specific activities
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

### Helper Functions (Optional)

For standalone definitions outside a contract:

```typescript
import { defineActivity, defineSignal, defineQuery, defineUpdate } from '@temporal-contract/contract';

// Standalone activity
const sendEmail = defineActivity({
  input: z.object({ to: z.string() }),
  output: z.object({ sent: z.boolean() }),
});

// Signal, query, update
const cancelOrder = defineSignal({ input: z.object({ reason: z.string() }) });
const getStatus = defineQuery({ input: z.void(), output: z.object({ status: z.string() }) });
const updateAmount = defineUpdate({ input: z.number(), output: z.boolean() });
```

## Type Utilities

Helper types for implementing activities with full type inference:

### Activity Handlers

```typescript
import type { ActivityHandler, WorkflowActivityHandler } from '@temporal-contract/contract';

// Global activity
const sendEmail: ActivityHandler<typeof myContract, 'sendEmail'> = 
  async ({ to, subject }) => {
    await emailService.send({ to, subject });
    return { sent: true };
  };

// Workflow-specific activity
const processPayment: WorkflowActivityHandler<typeof myContract, 'processOrder', 'processPayment'> = 
  async ({ amount }) => {
    const txId = await paymentGateway.charge(amount);
    return { transactionId: txId };
  };
```

### Contract Introspection

```typescript
import type { InferWorkflowNames, InferActivityNames } from '@temporal-contract/contract';

type Workflows = InferWorkflowNames<typeof myContract>;  // "processOrder" | ...
type Activities = InferActivityNames<typeof myContract>;  // "sendEmail" | ...
```

See [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for details.

---

## Learn More

- [Main README](../../README.md) — Quick start guide
- [Worker Implementation](../../docs/CONTRACT_HANDLER.md) — Implementing workers
- [Activity Handlers](../../docs/ACTIVITY_HANDLERS.md) — Type utility details

## License

MIT
