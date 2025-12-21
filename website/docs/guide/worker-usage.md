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
        return Future.fromPromise(paymentService.charge(customerId, amount))
          .mapError((error) =>
            new ActivityError(
              'PAYMENT_FAILED',
              error instanceof Error ? error.message : 'Payment processing failed',
              error
            )
          )
          .mapOk((result) => ({ transactionId: result.id }));
      },
    },
  },
});
```

## Implementing Workflows

Workflows must use `@temporal-contract/boxed` for Temporal's deterministic execution requirements. They return plain objects (not Result) due to network serialization. Activities called in workflows return plain values (Result is unwrapped by the framework):

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { myContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async ({ activities }, { orderId, customerId, amount }) => {
    // Activities return plain values (Result is unwrapped internally)
    const payment = await activities.processPayment({
      customerId,
      amount,
    });

    await activities.log({
      level: 'info',
      message: `Order ${orderId} processed with transaction ${payment.transactionId}`,
    });

    // Return plain object (not Result - network serialization requirement)
    return {
      success: true,
      transactionId: payment.transactionId,
    };
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
    .mapError((error) =>
      new ActivityError(
        'PAYMENT_FAILED', // Error code
        error instanceof Error ? error.message : 'Payment failed', // Message
        error // Original error
      )
    )
    .mapOk((transaction) => ({ transactionId: transaction.id }));
}
```

### Error Propagation

Activity errors are automatically propagated to workflows:

```typescript
const payment = await activities.processPayment({ customerId, amount });

// Activities return plain values - framework handles errors internally
// If an activity fails, the workflow will fail automatically
console.log('Payment successful:', payment.transactionId);
```

## Workflow Context

The workflow context provides typed access to activities:

```typescript
implementation: async ({ activities, info, sleep }, input) => {
  // Execute activities
  const result = await activities.someActivity(input);

  // Access workflow info
  console.log('Workflow ID:', info.workflowId);
  console.log('Run ID:', info.runId);

  // Use Temporal utilities
  await sleep('1 hour');

  return { success: true };
}
```

## Child Workflows

Execute child workflows with type safety:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';

export const parentWorkflow = declareWorkflow({
  workflowName: 'parentWorkflow',
  contract: myContract,
  implementation: async ({ executeChildWorkflow }, input) => {
    // Execute child workflow and wait
    const childOutput = await executeChildWorkflow(
      myContract,
      'processPayment',
      {
        workflowId: `payment-${input.orderId}`,
        args: { amount: input.amount, customerId: input.customerId },
      }
    );

    // Child workflow returns plain values
    return {
      success: true,
      transactionId: childOutput.transactionId
    };
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

### 1. Use Future.fromPromise with mapError/mapOk for Activities

Activities should use `Future.fromPromise` with `mapError` and `mapOk`:

```typescript
// ✅ Good - explicit error handling with Future.fromPromise
processPayment: ({ amount }) => {
  return Future.fromPromise(paymentService.charge(amount))
    .mapError((err) => new ActivityError('PAYMENT_FAILED', err.message, err))
    .mapOk((tx) => ({ transactionId: tx.id }));
}

// ❌ Avoid - using Future.make with try/catch
processPayment: ({ amount }) => {
  return Future.make(async (resolve) => {
    try {
      const tx = await paymentService.charge(amount);
      resolve(Result.Ok({ transactionId: tx.id }));
    } catch (err) {
      resolve(Result.Error(new ActivityError('PAYMENT_FAILED', err.message, err)));
    }
  });
}
```

### 2. Activities Return Plain DTOs (Not Result)

Activities internally use Result, but the framework unwraps them for network serialization:

```typescript
// ✅ Good - activity returns Future<Result<T, ActivityError>>
// Framework unwraps to plain DTO over network
processPayment: ({ amount }) =>
  Future.fromPromise(paymentService.charge(amount))
    .mapError((err) => new ActivityError('PAYMENT_FAILED', err.message, err))
    .mapOk((tx) => ({ transactionId: tx.id }))

// In workflow, you receive the plain value:
const payment = await activities.processPayment({ amount: 100 });
// payment is { transactionId: string }, not Result
```

### 3. Workflows Return Plain Objects (Not Result)

Workflows cannot return Result due to network serialization:

```typescript
// ✅ Good - return plain object
implementation: async ({ activities }, input) => {
  const payment = await activities.processPayment({ amount: 100 });
  return { success: true, transactionId: payment.transactionId };
}

// ❌ Avoid - returning Result (will lose instance over network)
implementation: async ({ activities }, input) => {
  const payment = await activities.processPayment({ amount: 100 });
  return Result.Ok({ transactionId: payment.transactionId }); // Won't work!
}
```

### 4. Use Descriptive Error Codes

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
