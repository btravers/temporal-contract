# @temporal-contract/worker-boxed

> Worker with Result/Future pattern for explicit error handling

Extends `@temporal-contract/worker` with functional error handling using [@swan-io/boxed](https://swan-io.github.io/boxed/).

## Why Use This?

**Explicit errors** in activity signatures instead of thrown exceptions:

```typescript
// ❌ Standard: Implicit errors
const pay = async (amount: number): Promise<PaymentResult> => {
  if (failed) throw new Error('Payment failed');  // Hidden error
  return { txId: '123' };
};

// ✅ Boxed: Explicit errors
const pay = (amount: number): Future<Result<PaymentResult, ActivityError>> => {
  return Future.make(resolve => {
    if (failed) {
      resolve(Result.Error({ code: 'PAYMENT_FAILED', message: '...' }));
    } else {
      resolve(Result.Ok({ txId: '123' }));
    }
  });
};
```

**Benefits:**

- Error types visible in signature
- Better testability (no try/catch)
- Functional composition
- Railway-oriented programming

## Installation

```bash
pnpm add @temporal-contract/worker-boxed @swan-io/boxed
pnpm add @temporalio/worker @temporalio/workflow zod
```

## Important: Separate Entry Points

⚠️ **Must use separate imports** to avoid bundling issues:

- **`@temporal-contract/worker-boxed/activity`** — For activities (includes `@swan-io/boxed`)
- **`@temporal-contract/worker-boxed/workflow`** — For workflows (NO `@swan-io/boxed`)

> Why? `@swan-io/boxed` uses `FinalizationRegistry` which is non-deterministic and forbidden in Temporal workflows.

## Quick Start

### 1. Implement Activities with Result Pattern

```typescript
// activities.ts
import { declareActivitiesHandler, Result, Future } from '@temporal-contract/worker-boxed/activity';
import type { BoxedActivityHandler } from '@temporal-contract/worker-boxed/activity';

const processPayment: BoxedActivityHandler<typeof contract, 'processOrder', 'processPayment'> =
  ({ customerId, amount }) => {
    return Future.make(async resolve => {
      try {
        const txId = await paymentService.charge(customerId, amount);
        resolve(Result.Ok({ transactionId: txId, success: true }));
      } catch (error) {
        resolve(Result.Error({
          code: 'PAYMENT_FAILED',
          message: error.message,
          details: { customerId, amount },
        }));
      }
    });
  };

export const activities = declareActivitiesHandler({
  contract,
  activities: { processPayment },
});
```

### 2. Workflows Auto-Unwrap Results

```typescript
// workflows.ts
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract,
  implementation: async (context, order) => {
    try {
      // Result automatically unwrapped — throws on Error
      const payment = await context.activities.processPayment({
        customerId: order.customerId,
        amount: order.total,
      });

      return { status: 'completed', transactionId: payment.transactionId };
    } catch (error) {
      // Access error.code, error.message, error.details
      return { status: 'failed', reason: error.code };
    }
  },
});
```

### 3. Start Worker

```typescript
import { Worker } from '@temporalio/worker';
import { activities } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activities.activities,
  taskQueue: activities.contract.taskQueue,
});

await worker.run();
```

## Error Structure

Activities return structured errors:

```typescript
interface ActivityError {
  code: string;       // e.g., 'PAYMENT_FAILED'
  message: string;    // Human-readable message
  details?: unknown;  // Additional context
}
```

When `Result.Error(...)` is returned, it's automatically converted to an exception in workflows.

## When to Use

**Use worker-boxed when:**

- You want explicit error types in signatures
- You prefer functional programming patterns
- You need better testability for activities
- You want railway-oriented programming

**Use standard worker when:**

- You prefer traditional exception handling
- You have simple error cases

Both approaches are valid!

## Utility Types

```typescript
import type { BoxedActivityHandler, BoxedWorkflowActivityHandler } from '@temporal-contract/worker-boxed/activity';

// Global activity
const sendEmail: BoxedActivityHandler<typeof contract, 'sendEmail'> = ({ to, subject }) => {
  return Future.make(resolve => {
    // ...
  });
};

// Workflow-specific activity
const pay: BoxedWorkflowActivityHandler<typeof contract, 'processOrder', 'processPayment'> =
  ({ amount }) => {
    return Future.make(resolve => {
      // ...
    });
  };
```

See [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for details.

---

## Learn More

- [Main README](../../README.md) — Quick start guide
- [Worker Implementation](../../docs/CONTRACT_HANDLER.md) — Complete guide
- [Entry Points](../../docs/ENTRY_POINTS.md) — Why separate entry points
- [@swan-io/boxed docs](https://swan-io.github.io/boxed/) — Result/Future API

## License

MIT
