# @temporal-contract/worker-boxed

Type-safe Temporal worker implementation with **Result/Future pattern** from [@swan-io/boxed](https://github.com/swan-io/boxed) for explicit error handling in activities.

## Why worker-boxed?

This package extends `@temporal-contract/worker` with a functional approach to error handling using the **Result** and **Future** patterns from `@swan-io/boxed`.

### Benefits

- ✅ **Explicit error handling**: Activities return `Result<T, E>` instead of throwing
- ✅ **Type-safe errors**: Error types are part of the signature
- ✅ **Composable**: Use Result/Future combinators for elegant error handling
- ✅ **Railway-oriented programming**: Chain operations safely
- ✅ **All validation from worker**: Input/output Zod validation still included

## Installation

```bash
pnpm add @temporal-contract/worker-boxed @swan-io/boxed
pnpm add @temporalio/worker @temporalio/workflow zod
```

## Usage

### 1. Implement Activities with Result Pattern

```typescript
import { declareActivitiesHandler, Result, Future } from '@temporal-contract/worker-boxed';
import type { BoxedActivityHandler, BoxedWorkflowActivityHandler } from '@temporal-contract/worker-boxed';
import { orderContract } from './contract';

// Using utility types for cleaner signatures
const sendEmail: BoxedActivityHandler<typeof orderContract, 'sendEmail'> = ({ to, subject, body }) => {
  return Future.make(async resolve => {
    try {
      await emailService.send({ to, subject, body });
      resolve(Result.Ok({ sent: true }));
    } catch (error) {
      resolve(Result.Error({
        code: 'EMAIL_FAILED',
        message: error.message,
      }));
    }
  });
};

export const activitiesHandler = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    // ✅ Returns Result instead of throwing
    processPayment: (customerId, amount) => {
      return Future.make(async resolve => {
        try {
          const result = await paymentService.charge(customerId, amount);
          resolve(Result.Ok({
            transactionId: result.id,
            success: true,
          }));
        } catch (error) {
          // Explicit error handling
          resolve(Result.Error({
            code: 'PAYMENT_FAILED',
            message: error.message,
            details: { customerId, amount },
          }));
        }
      });
    },

    // ✅ Railway-oriented programming
    validateInventory: (orderId) => {
      return Future.make(async resolve => {
        const stock = await inventory.check(orderId);

        if (stock > 0) {
          resolve(Result.Ok({ available: true, quantity: stock }));
        } else {
          resolve(Result.Error({
            code: 'OUT_OF_STOCK',
            message: `Order ${orderId} is out of stock`,
          }));
        }
      });
    },
  },
});
```

### 2. Activities are Unwrapped in Workflows

In workflows, activities still throw errors (Result is automatically unwrapped), maintaining Temporal's native error handling:

```typescript
import { declareWorkflow } from '@temporal-contract/worker-boxed';

export const processOrder = declareWorkflow({
  definition: orderContract.workflows.processOrder,
  contract: orderContract,
  implementation: async (context, order) => {
    try {
      // Activities throw on Error (unwrapped automatically)
      const payment = await context.activities.processPayment(
        order.customerId,
        order.total
      );

      const inventory = await context.activities.validateInventory(order.id);

      return {
        orderId: order.id,
        status: 'completed',
        transactionId: payment.transactionId,
      };
    } catch (error) {
      // Handle activity errors with error.code, error.details
      return {
        orderId: order.id,
        status: 'failed',
        error: error.code || 'UNKNOWN_ERROR',
        message: error.message,
      };
    }
  },
  // Optional: Define signal handlers
  signals: {
    cancelOrder: (reason) => {
      // Handle cancellation signal
      // reason is fully typed from contract definition
    },
  },
  // Optional: Define query handlers
  queries: {
    getOrderStatus: () => {
      // Return current status synchronously
      return { status: 'processing', updatedAt: Date.now() };
    },
  },
  // Optional: Define update handlers
  updates: {
    updateShippingAddress: async (newAddress) => {
      // Update order and return confirmation
      // newAddress is fully typed from contract definition
      return { updated: true, address: newAddress };
    },
  },
});
```

### 3. Setup Worker

```typescript
import { Worker } from '@temporalio/worker';
import { activitiesHandler } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activitiesHandler.activities,
  taskQueue: activitiesHandler.contract.taskQueue,
});

await worker.run();
```

## Error Structure

Activities return errors with a structured format:

```typescript
interface ActivityError {
  code: string;           // Error code (e.g., 'PAYMENT_FAILED')
  message: string;        // Human-readable message
  details?: unknown;      // Additional context
}
```

When an activity returns `Result.Error(...)`, it's automatically converted to a thrown exception in workflows with these properties accessible via `error.code`, `error.message`, and `error.details`.

## Pattern Comparison

### Standard worker (exception-based)

```typescript
const sendEmail = async (to, subject, body) => {
  // Throws on error
  await emailService.send({ to, subject, body });
  return { sent: true };
};
```

### Boxed worker (Result-based)

```typescript
const sendEmail = (to, subject, body) => {
  return Future.make(async resolve => {
    try {
      await emailService.send({ to, subject, body });
      resolve(Result.Ok({ sent: true }));
    } catch (error) {
      resolve(Result.Error({
        code: 'EMAIL_SEND_FAILED',
        message: error.message,
        details: error,
      }));
    }
  });
};
```

## Why Use This Pattern?

1. **Explicit errors**: Errors are part of the return type, not hidden in throws
2. **Better testability**: Mock `Result.Ok` or `Result.Error` without try/catch
3. **Functional composition**: Chain operations with `map`, `flatMap`, `getOr`, etc.
4. **Type safety**: TypeScript knows about both success and error cases
5. **Railway-oriented programming**: Build robust error handling pipelines

## Boxed Library Features

This package re-exports key utilities from [@swan-io/boxed](https://github.com/swan-io/boxed):

- **Result**: Success/Error sum type
- **Future**: Promise wrapper with better composition
- **Option**: Some/None for nullable values
- **AsyncData**: Loading/Done/Error states

See the [boxed documentation](https://swan-io.github.io/boxed/) for full API.

## Utility Types

For cleaner activity implementations with the Result pattern, use the utility types exported by this package:

- `BoxedActivityHandler<TContract, TActivityName>` - For global activities
- `BoxedWorkflowActivityHandler<TContract, TWorkflowName, TActivityName>` - For workflow-specific activities

See the [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for more details.

## API

### `declareActivitiesHandler(options)`

Creates an activities handler where implementations use Result pattern.

**Parameters:**

- `contract` - The full contract definition
- `activities` - Object mapping activity names to Result-based implementations

```typescript
type BoxedActivityImplementation<T> = (
  ...args: InferInput<T>
) => Future<Result<InferOutput<T>, ActivityError>>;
```

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

### `ActivityError`

Standard error structure for activity failures:

```typescript
interface ActivityError {
  code: string;
  message: string;
  details?: unknown;
}
```

## License

MIT
