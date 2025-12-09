# @temporal-contract/contract

Contract builder for defining Temporal workflows and activities with type safety.

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

## License

MIT
