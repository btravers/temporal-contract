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
import { declareWorkflow } from '@temporal-contract/worker';
import { myContract } from './contract';

const processOrder = declareWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (context, input) => {
    // input is fully typed based on the contract
    // context.activities are fully typed (workflow + global activities)
    // context.info: WorkflowInfo

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
  // Optional: Define signal handlers
  signals: {
    addItem: (item) => {
      // Handle signal - update workflow state
      // item is fully typed from contract definition
    },
  },
  // Optional: Define query handlers
  queries: {
    getStatus: (args) => {
      // Return current status synchronously
      // args is fully typed from contract definition
      return { status: 'processing' };
    },
  },
  // Optional: Define update handlers
  updates: {
    updateDiscount: async (discount) => {
      // Update workflow state and return result
      // discount is fully typed from contract definition
      return { newTotal: 100 };
    },
  },
});
```

## Features

- ✅ Automatic input validation with Zod schemas
- ✅ Automatic output validation with Zod schemas
- ✅ Full TypeScript type inference
- ✅ Typed activity proxies in workflows
- ✅ Type-safe signal handlers with validation
- ✅ Type-safe query handlers with validation
- ✅ Type-safe update handlers with validation

## API

### `createActivity(options)`

Creates a typed activity implementation with validation.

**Parameters:**

- `definition` - Activity definition from contract
- `implementation` - Activity implementation function (receives validated input, returns validated output)

### `declareWorkflow(options)`

Creates a typed workflow implementation with validation and typed activities.

**Parameters:**

- `definition` - Workflow definition from contract
- `contract` - The full contract definition
- `implementation` - Workflow implementation function (receives context and validated input)
- `activityOptions` - Optional default activity options
- `signals` - Optional signal handler implementations (must match definitions in workflow)
- `queries` - Optional query handler implementations (must match definitions in workflow)
- `updates` - Optional update handler implementations (must match definitions in workflow)

All handlers receive validated inputs and return validated outputs based on the Zod schemas defined in the contract.

## License

MIT
