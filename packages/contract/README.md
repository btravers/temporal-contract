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

## Type Utilities\n\nHelper types for implementing activities with full type inference:\n\n### Activity Handlers\n\n```typescript\nimport type { ActivityHandler, WorkflowActivityHandler } from '@temporal-contract/contract';\n\n// Global activity\nconst sendEmail: ActivityHandler<typeof myContract, 'sendEmail'> = \n  async ({ to, subject }) => {\n    await emailService.send({ to, subject });\n    return { sent: true };\n  };\n\n// Workflow-specific activity\nconst processPayment: WorkflowActivityHandler<typeof myContract, 'processOrder', 'processPayment'> = \n  async ({ amount }) => {\n    const txId = await paymentGateway.charge(amount);\n    return { transactionId: txId };\n  };\n```\n\n### Contract Introspection\n\n```typescript\nimport type { InferWorkflowNames, InferActivityNames } from '@temporal-contract/contract';\n\ntype Workflows = InferWorkflowNames<typeof myContract>;  // \"processOrder\" | ...\ntype Activities = InferActivityNames<typeof myContract>;  // \"sendEmail\" | ...\n```\n\nSee [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for details.\n\n---\n\n## Learn More\n\n- [Main README](../../README.md) \u2014 Quick start guide\n- [Worker Implementation](../../docs/CONTRACT_HANDLER.md) \u2014 Implementing workers\n- [Activity Handlers](../../docs/ACTIVITY_HANDLERS.md) \u2014 Type utility details\n\n## License\n\nMIT
