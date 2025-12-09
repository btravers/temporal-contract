# @temporal-contract/contract

Contract builder and type definitions for Temporal workflows and activities with complete type safety.

This package contains:

- Contract builder (`defineContract`)
- Core type definitions and inference utilities
- Helper functions for defining activities, workflows, signals, queries, and updates
- Type utilities for worker and client implementations

## Installation

```bash
pnpm add @temporal-contract/contract zod
```

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

## API

### `defineContract(definition)`

Creates a contract definition with workflows and optional global activities.

The type system automatically infers the structure, so you don't need to use helper functions when defining activities, workflows, signals, queries, and updates inside a contract.

### Helper Functions

These helper functions are available for standalone definitions (outside of a contract) or when you need explicit typing:

#### `defineActivity(definition)`

```typescript
import { defineActivity } from '@temporal-contract/contract';

const sendEmail = defineActivity({
  input: z.object({ to: z.string(), subject: z.string() }),
  output: z.object({ sent: z.boolean() }),
});
```

#### `defineSignal(definition)`

```typescript
import { defineSignal } from '@temporal-contract/contract';

const cancelOrder = defineSignal({
  input: z.object({ reason: z.string() }),
});
```

#### `defineQuery(definition)`

```typescript
import { defineQuery } from '@temporal-contract/contract';

const getStatus = defineQuery({
  input: z.void(),
  output: z.object({ status: z.string() }),
});
```

#### `defineUpdate(definition)`

```typescript
import { defineUpdate } from '@temporal-contract/contract';

const updateAmount = defineUpdate({
  input: z.object({ newAmount: z.number() }),
  output: z.object({ updated: z.boolean() }),
});
```

#### `defineWorkflow(definition)`

```typescript
import { defineWorkflow } from '@temporal-contract/contract';

const processOrder = defineWorkflow({
  input: z.object({ orderId: z.string() }),
  output: z.object({ status: z.string() }),
  activities: { /* ... */ },
  signals: { /* ... */ },
  queries: { /* ... */ },
  updates: { /* ... */ },
});
```

## Type Utilities

This package also exports utility types for cleaner handler implementations:

### `ActivityHandler<TContract, TActivityName>`

Utility type for implementing global activities with full type inference:

```typescript
import type { ActivityHandler } from '@temporal-contract/contract';
import type { myContract } from './contract';

const sendEmail: ActivityHandler<typeof myContract, 'sendEmail'> = async ({ to, subject, body }) => {
  await emailService.send({ to, subject, body });
  return { sent: true };
};
```

### `WorkflowActivityHandler<TContract, TWorkflowName, TActivityName>`

Utility type for implementing workflow-specific activities:

```typescript
import type { WorkflowActivityHandler } from '@temporal-contract/contract';
import type { myContract } from './contract';

const processPayment: WorkflowActivityHandler<
  typeof myContract,
  'processOrder',
  'processPayment'
> = async ({ amount }) => {
  const transactionId = await paymentGateway.charge(amount);
  return { transactionId };
};
```

### Contract Introspection Types

#### `InferWorkflowNames<TContract>`

Extract workflow names from a contract as a union type:

```typescript
import type { InferWorkflowNames } from '@temporal-contract/contract';
import type { myContract } from './contract';

type MyWorkflowNames = InferWorkflowNames<typeof myContract>;
// "processOrder" | "cancelOrder" | ...
```

#### `InferActivityNames<TContract>`

Extract global activity names from a contract as a union type:

```typescript
import type { InferActivityNames } from '@temporal-contract/contract';
import type { myContract } from './contract';

type MyActivityNames = InferActivityNames<typeof myContract>;
// "sendEmail" | "logEvent" | ...
```

#### `InferContractWorkflows<TContract>`

Extract all workflows from a contract with their definitions:

```typescript
import type { InferContractWorkflows } from '@temporal-contract/contract';
import type { myContract } from './contract';

type MyWorkflows = InferContractWorkflows<typeof myContract>;
// { processOrder: WorkflowDefinition<...>, ... }
```

See the [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for more details.

## License

MIT
