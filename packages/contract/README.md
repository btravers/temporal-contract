# @temporal-contract/contract

Contract builder for defining Temporal workflows and activities with type safety.

## Installation

```bash
pnpm add @temporal-contract/contract zod
```

## Usage

```typescript
import { z } from 'zod';
import { contract, workflow, activity } from '@temporal-contract/contract';

export const myContract = contract({
  workflows: {
    processOrder: workflow({
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
        processPayment: activity({
          input: z.object({ amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        }),
      },
    }),
  },
});
```

## API

### `contract(definition)`

Creates a contract definition with workflows and optional global activities.

### `workflow(config)`

Defines a workflow with input/output schemas and optional activities.

### `activity(config)`

Defines an activity with input/output schemas.

## License

MIT
