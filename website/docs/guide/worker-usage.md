# Worker Usage

Learn how to implement and run type-safe workers with temporal-contract.

## Overview

The `@temporal-contract/worker` package provides type-safe implementations for workflows and activities based on your contract definitions.

## Installation

```bash
pnpm add @temporal-contract/worker @swan-io/boxed
```

## Implementing Activities

Activities use `@swan-io/boxed` for explicit error handling:

```typescript
import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker/activity';
import { Future, Result } from '@swan-io/boxed';
import { myContract } from './contract';

export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    // Global activities
    log: ({ level, message }) => {
      console.log(`[${level}] ${message}`);
      return Future.value(Result.Ok(undefined));
    },

    // Workflow-specific activities
    processOrder: {
      processPayment: ({ customerId, amount }) => {
        return Future.make(async (resolve) => {
          try {
            const result = await paymentService.charge(customerId, amount);
            resolve(Result.Ok({ transactionId: result.id }));
          } catch (error) {
            resolve(Result.Error(
              new ActivityError(
                'PAYMENT_FAILED',
                error instanceof Error ? error.message : 'Payment processing failed',
                error
              )
            ));
          }
        });
      },
    },
  },
});
```

## Implementing Workflows

Workflows can use either `@swan-io/boxed` or `@temporal-contract/boxed` depending on your needs. For Temporal's deterministic execution requirements, use `@temporal-contract/boxed`:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { Result } from '@temporal-contract/boxed';
import { myContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, { orderId, customerId, amount }) => {
    // Activities are fully typed
    const paymentResult = await context.activities.processPayment({
      customerId,
      amount,
    });

    if (paymentResult.isError()) {
      return Result.Error({
        type: 'PAYMENT_FAILED',
        error: paymentResult.getError(),
      });
    }

    const payment = paymentResult.get();

    await context.activities.log({
      level: 'info',
      message: `Order ${orderId} processed with transaction ${payment.transactionId}`,
    });

    return Result.Ok({
      success: true,
      transactionId: payment.transactionId,
    });
  },
});
```

## Starting a Worker

```typescript
import { NativeConnection, Worker } from '@temporalio/worker';
import { createWorker } from '@temporal-contract/worker/worker';
import { myContract } from './contract';
import { activities } from './activities';

async function main() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  });

  const worker = await createWorker({
    contract: myContract,
    connection,
    namespace: 'default',
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  console.log('Worker started, listening on task queue:', myContract.taskQueue);
  await worker.run();
}

main().catch((error) => {
  console.error('Worker failed:', error);
  process.exit(1);
});
```

## Activity Error Handling

### ActivityError Class

Use `ActivityError` for typed activity errors:

```typescript
import { ActivityError } from '@temporal-contract/worker/activity';
import { Future, Result } from '@swan-io/boxed';

processPayment: ({ customerId, amount }) => {
  return Future.fromPromise(
    paymentService.charge(customerId, amount)
  )
    .mapOk((transaction) => ({ transactionId: transaction.id }))
    .mapError((error) =>
      new ActivityError(
        'PAYMENT_FAILED', // Error code
        error instanceof Error ? error.message : 'Payment failed', // Message
        error // Original error
      )
    );
}
```

### Error Propagation

Activity errors are automatically propagated to workflows:

```typescript
const result = await context.activities.processPayment({ customerId, amount });

if (result.isError()) {
  const error = result.getError(); // ActivityError instance
  console.error('Activity failed:', error.code, error.message);
  
  // Handle specific error codes
  if (error.code === 'PAYMENT_FAILED') {
    // Handle payment failure
  }
}
```

## Workflow Context

The workflow context provides typed access to activities:

```typescript
implementation: async (context, input) => {
  // Execute activities
  const result = await context.activities.someActivity(input);
  
  // Access workflow info
  console.log('Workflow ID:', context.info.workflowId);
  console.log('Run ID:', context.info.runId);
  
  // Use Temporal utilities
  await context.sleep('1 hour');
  
  return Result.Ok({ success: true });
}
```

## Child Workflows

Execute child workflows with type safety:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { Result } from '@temporal-contract/boxed';

export const parentWorkflow = declareWorkflow({
  workflowName: 'parentWorkflow',
  contract: myContract,
  implementation: async (context, input) => {
    // Execute child workflow and wait
    const childResult = await context.executeChildWorkflow(
      myContract,
      'processPayment',
      {
        workflowId: `payment-${input.orderId}`,
        args: { amount: input.amount, customerId: input.customerId },
      }
    );

    return childResult.match({
      Ok: (output) => Result.Ok({ success: true, transactionId: output.transactionId }),
      Error: (error) => Result.Error({ type: 'CHILD_FAILED', error }),
    });
  },
});
```

## Graceful Shutdown

Handle shutdown signals properly:

```typescript
async function main() {
  const worker = await createWorker({
    contract: myContract,
    connection,
    namespace: 'default',
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
    await worker.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('Worker started');
  await worker.run();
}
```

## Multiple Workers

Run multiple workers with different contracts:

```typescript
const orderWorker = await createWorker({
  contract: orderContract,
  connection,
  namespace: 'default',
  workflowsPath: require.resolve('./order-workflows'),
  activities: orderActivities,
});

const paymentWorker = await createWorker({
  contract: paymentContract,
  connection,
  namespace: 'default',
  workflowsPath: require.resolve('./payment-workflows'),
  activities: paymentActivities,
});

// Run both workers concurrently
await Promise.all([
  orderWorker.run(),
  paymentWorker.run(),
]);
```

## Testing

Test activities and workflows in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { Result } from '@swan-io/boxed';
import { activities } from './activities';

describe('Activities', () => {
  it('should process payment successfully', async () => {
    const result = await activities.activities.processOrder.processPayment({
      customerId: 'CUST-123',
      amount: 100,
    });

    const value = await result;
    expect(value.isOk()).toBe(true);
    expect(value.get()).toEqual({
      transactionId: expect.any(String),
    });
  });
});
```

## Best Practices

### 1. Use Future for Activities

Activities should return `Future<Result<T, ActivityError>>`:

```typescript
// ✅ Good - explicit error handling
processPayment: ({ amount }) => {
  return Future.fromPromise(paymentService.charge(amount))
    .mapOk((tx) => ({ transactionId: tx.id }))
    .mapError((err) => new ActivityError('PAYMENT_FAILED', err.message, err));
}

// ❌ Avoid - throwing exceptions
processPayment: async ({ amount }) => {
  const tx = await paymentService.charge(amount); // Might throw
  return { transactionId: tx.id };
}
```

### 2. Handle Activity Failures in Workflows

```typescript
// ✅ Good - explicit error handling
const result = await context.activities.processPayment({ amount: 100 });
if (result.isError()) {
  return Result.Error({ type: 'PAYMENT_FAILED', error: result.getError() });
}

// ❌ Avoid - assuming success
const payment = await context.activities.processPayment({ amount: 100 });
return Result.Ok({ transactionId: payment.transactionId }); // Might crash
```

### 3. Use Descriptive Error Codes

```typescript
// ✅ Good - clear error codes
new ActivityError('PAYMENT_GATEWAY_TIMEOUT', 'Gateway did not respond')
new ActivityError('INSUFFICIENT_FUNDS', 'Customer has insufficient balance')

// ❌ Avoid - generic errors
new ActivityError('ERROR', 'Something went wrong')
```

## See Also

- [Defining Contracts](/guide/defining-contracts) - Creating contract definitions
- [Client Usage](/guide/client-usage) - Executing workflows from clients
- [Result Pattern](/guide/result-pattern) - Understanding Result/Future patterns
- [NestJS Worker Usage](/guide/worker-nestjs-usage) - Using workers with NestJS
- [API Reference](/api/worker) - Complete worker API documentation
