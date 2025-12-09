# @temporal-contract/worker

Worker utilities for implementing temporal-contract workflows and activities.

## Installation

```bash
pnpm add @temporal-contract/worker @temporal-contract/contract @temporalio/workflow zod
```

## Usage

### Implementing Activities

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker';
import type { ActivityHandler, WorkflowActivityHandler } from '@temporal-contract/contract';
import { myContract } from './contract';

// Using utility types for cleaner signatures
const sendEmail: ActivityHandler<typeof myContract, 'sendEmail'> = async ({ to, subject, body }) => {
  await emailService.send({ to, subject, body });
  return { sent: true };
};

const processPayment: WorkflowActivityHandler<
  typeof myContract,
  'processOrder',
  'processPayment'
> = async ({ amount }) => {
  const transactionId = await paymentGateway.charge(amount);
  return { transactionId, success: true };
};

export const activitiesHandler = declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail,
    processPayment,
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

## Utility Types

For cleaner activity implementations without explicit type annotations, use the utility types from `@temporal-contract/contract`:

- `ActivityHandler<TContract, TActivityName>` - For global activities
- `WorkflowActivityHandler<TContract, TWorkflowName, TActivityName>` - For workflow-specific activities

See the [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for more details.

## API

### `declareActivitiesHandler(options)`

Creates an activities handler with validation for all activities (global + workflow-specific).

**Parameters:**

- `contract` - The full contract definition
- `activities` - Object mapping activity names to implementations

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

## Error Handling

The worker package provides custom error classes for better error handling:

### Error Classes

- **`WorkerError`** - Base error class for all worker errors
- **`ActivityImplementationNotFoundError`** - Thrown when an activity implementation is missing
- **`ActivityDefinitionNotFoundError`** - Thrown when an activity is not defined in the contract, includes list of available activities
- **`ActivityInputValidationError`** - Thrown when activity input validation fails, includes Zod error details
- **`ActivityOutputValidationError`** - Thrown when activity output validation fails, includes Zod error details
- **`WorkflowInputValidationError`** - Thrown when workflow input validation fails
- **`WorkflowOutputValidationError`** - Thrown when workflow output validation fails
- **`SignalInputValidationError`** - Thrown when signal input validation fails
- **`QueryInputValidationError`** - Thrown when query input validation fails
- **`QueryOutputValidationError`** - Thrown when query output validation fails
- **`UpdateInputValidationError`** - Thrown when update input validation fails
- **`UpdateOutputValidationError`** - Thrown when update output validation fails

### Example

```typescript
import {
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
} from '@temporal-contract/worker';

// Activity definition error includes helpful context
try {
  // ...worker setup
} catch (error) {
  if (error instanceof ActivityDefinitionNotFoundError) {
    console.error('Activity not found:', error.activityName);
    console.error('Available activities:', error.availableActivities);
  }
}

// Validation errors include Zod error details
try {
  // ...activity implementation
} catch (error) {
  if (error instanceof ActivityInputValidationError) {
    console.error('Activity input validation failed:', error.activityName);
    console.error('Validation errors:', error.zodError.errors);
  }
}
```

All errors include rich contextual information to help identify and fix issues quickly.

## License

MIT
