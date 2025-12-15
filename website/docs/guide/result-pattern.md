# Result Pattern

Learn how to use explicit error handling with the Result/Future pattern.

## Overview

The `@temporal-contract/worker` and `@temporal-contract/client` packages use the Result/Future pattern from [@swan-io/boxed](https://swan-io.github.io/boxed/) for explicit error handling.

## Why Use Result Pattern?

### Traditional Exception-Based

```typescript
try {
  const payment = await processPayment({ amount: 100 });
  const email = await sendEmail({ to: 'user@example.com' });
  return { success: true };
} catch (error) {
  // What failed? Payment or email?
  // What type of error?
  return { success: false };
}
```

### Result Pattern

```typescript
const payment = await processPayment({ amount: 100 });
if (payment.isError()) {
  return Result.Error({ type: 'PaymentFailed', error: payment.getError() });
}

const email = await sendEmail({ to: 'user@example.com' });
if (email.isError()) {
  return Result.Error({ type: 'EmailFailed', error: email.getError() });
}

return Result.Ok({ success: true });
```

## Installation

```bash
pnpm add @temporal-contract/worker @temporal-contract/client @swan-io/boxed
```

## Basic Usage

### Activities

Use `Future<T, E>` for async activities:

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { Future } from '@swan-io/boxed';
import { orderContract } from './contract';

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    processPayment: ({ amount }) => {
      return Future.fromPromise(paymentGateway.charge(amount))
        .map(txId => ({ transactionId: txId, success: true }))
        .mapError(error => ({ type: 'PaymentFailed', message: error instanceof Error ? error.message : 'Unknown error' }));
    },

    sendEmail: ({ to, body }) => {
      return Future.fromPromise(emailService.send({ to, body }))
        .map(() => ({ sent: true }))
        .mapError(error => ({ type: 'EmailFailed', message: error instanceof Error ? error.message : 'Unknown error' }));
    }
  }
});
```

### Workflows

Use `Result<T, E>` for workflows:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { Result } from '@swan-io/boxed';
import { orderContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, { orderId, amount }) => {
    // Process payment
    const paymentResult = await context.activities.processPayment({ amount });

    if (paymentResult.isError()) {
      return Result.Error({
        type: 'OrderFailed',
        reason: 'PaymentFailed',
        error: paymentResult.getError()
      });
    }

    const payment = paymentResult.get();

    // Send confirmation email
    const emailResult = await context.activities.sendEmail({
      to: 'customer@example.com',
      body: `Order ${orderId} confirmed`
    });

    if (emailResult.isError()) {
      // Payment succeeded but email failed
      return Result.Error({
        type: 'OrderFailed',
        reason: 'EmailFailed',
        error: emailResult.getError(),
        partialSuccess: { payment }
      });
    }

    return Result.Ok({
      success: true,
      transactionId: payment.transactionId
    });
  }
});
```

## Pattern Matching

Use `.match()` for elegant error handling:

```typescript
const result = await context.activities.processPayment({ amount: 100 });

return result.match({
  Ok: (payment) => {
    console.log('Payment succeeded:', payment.transactionId);
    return Result.Ok({ success: true });
  },
  Error: (error) => {
    console.error('Payment failed:', error);
    return Result.Error({ type: 'PaymentFailed', error });
  }
});
```

## Chaining Results

Chain operations with `.flatMap()`:

```typescript
const result = await context.activities.processPayment({ amount: 100 })
  .flatMap(async (payment) => {
    // Only runs if payment succeeded
    return context.activities.sendEmail({
      to: 'customer@example.com',
      body: `Payment ${payment.transactionId} processed`
    });
  })
  .flatMap(async (email) => {
    // Only runs if both payment and email succeeded
    return context.activities.updateDatabase({
      status: 'completed'
    });
  });

return result.match({
  Ok: () => Result.Ok({ success: true }),
  Error: (error) => Result.Error({ type: 'WorkflowFailed', error })
});
```

## Error Types

Define typed errors:

```typescript
type PaymentError =
  | { type: 'InsufficientFunds' }
  | { type: 'CardDeclined' }
  | { type: 'NetworkError', message: string };

type EmailError =
  | { type: 'InvalidEmail' }
  | { type: 'ServiceUnavailable' };

// Activities return typed errors
processPayment: ({ amount }) => {
  return Future.fromPromise(paymentGateway.charge(amount))
    .map<{ transactionId: string }>(txId => ({ transactionId: txId }))
    .mapError<PaymentError>(error => ({
      type: 'CardDeclined',
      // error qualification logic
    }));
}
```

## Benefits

### 1. Explicit Error Handling

Errors are part of the type system:

```typescript
// TypeScript knows this can fail
const result: Future<Payment, PaymentError> =
  context.activities.processPayment({ amount: 100 });

// Must handle error case
if (result.isError()) {
  // Handle error
}
```

### 2. No Hidden Exceptions

All failures are explicit in the return type:

```typescript
// ✅ Clear - returns Result
async function processOrder(): Promise<Result<Order, OrderError>> { /* ... */ }

// ❌ Unclear - might throw anything
async function processOrder(): Promise<Order> { /* ... */ }
```

### 3. Railway-Oriented Programming

Chain operations that short-circuit on error:

```typescript
return await validateOrder({ orderId })
  .flatMap(() => checkInventory({ orderId }))
  .flatMap(() => processPayment({ amount }))
  .flatMap(() => sendConfirmation({ orderId }));
// Stops at first error
```

### 4. Partial Success Handling

Track partial success in complex workflows:

```typescript
const paymentResult = await processPayment({ amount });
if (paymentResult.isError()) {
  return Result.Error({ step: 'payment', error: paymentResult.getError() });
}

const shipmentResult = await scheduleShipment({ orderId });
if (shipmentResult.isError()) {
  // Payment succeeded, shipment failed - can handle specially
  return Result.Error({
    step: 'shipment',
    error: shipmentResult.getError(),
    completedSteps: { payment: paymentResult.get() }
  });
}
```

## Child Workflows

Child workflows use the same Future/Result pattern for consistent error handling:

### Execute and Wait

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';

export const parentWorkflow = declareWorkflow({
  workflowName: 'parentWorkflow',
  contract: myContract,
  implementation: async (context, input) => {
    // Execute child workflow and wait for result
    const result = await context.executeChildWorkflow(myContract, 'processPayment', {
      workflowId: `payment-${input.orderId}`,
      args: { amount: input.totalAmount }
    }).toPromise();

    return result.match({
      Ok: (output) => Result.Ok({
        success: true,
        transactionId: output.transactionId
      }),
      Error: (error) => Result.Error({
        type: 'ChildWorkflowFailed',
        error
      }),
    });
  },
});
```

### Start Without Waiting

```typescript
export const parentWorkflow = declareWorkflow({
  workflowName: 'parentWorkflow',
  contract: myContract,
  implementation: async (context, input) => {
    // Start child workflow without waiting
    const handleResult = await context.startChildWorkflow(myContract, 'sendNotification', {
      workflowId: `notification-${input.orderId}`,
      args: { message: 'Order received' }
    }).toPromise();

    handleResult.match({
      Ok: async (handle) => {
        // Child started successfully
        // Can wait for result later if needed
        const result = await handle.result().toPromise();
      },
      Error: (error) => {
        console.error('Failed to start child:', error);
      },
    });

    return Result.Ok({ success: true });
  },
});
```

### Cross-Contract Child Workflows

Invoke workflows from different contracts/workers:

```typescript
import { orderContract, notificationContract } from './contracts';

export const orderWorkflow = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, input) => {
    // Child workflow from another contract
    const notifyResult = await context.executeChildWorkflow(
      notificationContract,
      'sendOrderConfirmation',
      {
        workflowId: `notify-${input.orderId}`,
        args: { orderId: input.orderId }
      }
    ).toPromise();

    return notifyResult.match({
      Ok: () => Result.Ok({ status: 'completed' }),
      Error: (error) => Result.Error({
        type: 'NotificationFailed',
        error
      }),
    });
  },
});
```

## When to Use

### Use Result Pattern When:

- You need explicit error types
- You want to track partial success
- You prefer functional programming style
- You need fine-grained error handling

### Use Standard Pattern When:

- You're comfortable with exceptions
- You prefer imperative style
- You have simple error handling needs
- You want less boilerplate

## See Also

- [@swan-io/boxed Documentation](https://swan-io.github.io/boxed/)
- [Order Processing Example](/examples/basic-order-processing)
- [Worker Implementation](/guide/worker-implementation)
