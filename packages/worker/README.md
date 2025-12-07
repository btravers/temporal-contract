# @temporal-contract/worker

Worker utilities for implementing temporal-contract workflows and activities.

## Installation

```bash
pnpm add @temporal-contract/worker @temporal-contract/contract @temporalio/workflow zod
```

## Usage

### Implementing Activities

```typescript
import { createActivity } from '@temporal-contract/worker';
import { myContract } from './contract';

const processPayment = createActivity({
  definition: myContract.workflows.processOrder.activities!.processPayment,
  implementation: async (input) => {
    // input is fully typed based on the contract
    const transactionId = await paymentGateway.charge(input.amount);
    return { transactionId, success: true };
  },
});
```

### Implementing Workflows

```typescript
import { createWorkflow } from '@temporal-contract/worker';
import { myContract } from './contract';

const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  implementation: async (input, context) => {
    // input is fully typed
    // context.activities are fully typed
    const payment = await context.activities.processPayment({
      amount: input.totalAmount,
    });

    return {
      status: payment.success ? 'success' : 'failed',
      totalAmount: input.totalAmount,
    };
  },
  activityOptions: {
    startToCloseTimeout: '1 minute',
  },
});
```

## Features

- ✅ Automatic input validation with Zod schemas
- ✅ Automatic output validation with Zod schemas
- ✅ Full TypeScript type inference
- ✅ Typed activity proxies in workflows

## API

### `createActivity(options)`

Creates a typed activity implementation with validation.

### `createWorkflow(options)`

Creates a typed workflow implementation with validation and typed activities.

## License

MIT
