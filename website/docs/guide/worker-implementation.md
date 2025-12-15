# Worker Implementation

This guide explains how to implement workers using temporal-contract.

## Overview

The `@temporal-contract/worker` package provides functions for implementing Temporal workers with full type safety:

1. **`declareActivitiesHandler`** - Implements all activities (global + workflow-specific)
2. **`declareWorkflow`** - Implements individual workflows with typed context

## Activities Handler

Create a handler for all activities:

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { myContract } from './contract';

export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    // Global activities
    sendEmail: async ({ to, subject, body }) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },

    // Workflow-specific activities
    processPayment: async ({ customerId, amount }) => {
      const txId = await paymentGateway.charge(customerId, amount);
      return { transactionId: txId, success: true };
    },
  },
});
```

## Workflow Implementation

Implement workflows with typed context:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { myContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, input) => {
    // context.activities is fully typed
    const payment = await context.activities.processPayment({
      customerId: input.customerId,
      amount: 100
    });

    await context.activities.sendEmail({
      to: input.customerId,
      subject: 'Order Confirmed',
      body: 'Your order has been processed'
    });

    return {
      status: payment.success ? 'success' : 'failed',
      transactionId: payment.transactionId
    };
  },
});
```

## Worker Setup

Set up the Temporal worker:

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

## Type Safety Features

### Input Validation

All activity and workflow inputs are automatically validated:

```typescript
// ✅ Valid - matches schema
await context.activities.processPayment({
  customerId: 'CUST-123',
  amount: 100
});

// ❌ Invalid - throws validation error
await context.activities.processPayment({
  customerId: 123,  // Should be string
  amount: -10       // Should be positive
});
```

### Output Validation

Return values are validated against output schemas:

```typescript
// ✅ Valid
return { transactionId: 'TXN-123', success: true };

// ❌ Invalid - TypeScript error + runtime validation
return { txId: 'TXN-123' };  // Wrong field name
```

### Typed Context

The workflow context is fully typed based on your contract:

```typescript
implementation: async (context, input) => {
  // TypeScript knows all available activities
  context.activities.processPayment  // ✅ Available
  context.activities.unknownActivity // ❌ TypeScript error

  // Full autocomplete for parameters
  await context.activities.processPayment({
    // IDE shows: customerId: string, amount: number
  });
}
```

## Child Workflows

Execute child workflows with type-safe Future/Result pattern. Child workflows can be from the same contract or from a different contract (cross-worker communication).

### Basic Usage

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { myContract, notificationContract } from './contracts';

export const parentWorkflow = declareWorkflow({
  workflowName: 'parentWorkflow',
  contract: myContract,
  implementation: async (context, input) => {
    // Execute child workflow from same contract and wait for result
    const result = await context.executeChildWorkflow(myContract, 'processPayment', {
      workflowId: `payment-${input.orderId}`,
      args: { amount: input.totalAmount }
    }).toPromise();

    result.match({
      Ok: (output) => console.log('Payment processed:', output),
      Error: (error) => console.error('Payment failed:', error),
    });

    return { success: true };
  },
});
```

### Cross-Contract Child Workflows

Invoke child workflows from different contracts and workers:

```typescript
export const orderWorkflow = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, input) => {
    // Process payment in same contract
    const paymentResult = await context.executeChildWorkflow(
      orderContract,
      'processPayment',
      {
        workflowId: `payment-${input.orderId}`,
        args: { amount: input.total }
      }
    ).toPromise();

    if (paymentResult.isError()) {
      return { status: 'failed', reason: 'payment' };
    }

    // Send notification using another worker's contract
    const notificationResult = await context.executeChildWorkflow(
      notificationContract,
      'sendOrderConfirmation',
      {
        workflowId: `notify-${input.orderId}`,
        args: { orderId: input.orderId, email: input.customerEmail }
      }
    ).toPromise();

    return {
      status: 'completed',
      transactionId: paymentResult.value.transactionId
    };
  },
});
```

### Start Without Waiting

Use `startChildWorkflow` to start a child workflow without waiting for its result:

```typescript
export const orderWorkflow = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, input) => {
    // Start background notification workflow
    const handleResult = await context.startChildWorkflow(
      notificationContract,
      'sendEmail',
      {
        workflowId: `email-${input.orderId}`,
        args: { to: input.customerEmail, subject: 'Order received' }
      }
    ).toPromise();

    handleResult.match({
      Ok: async (handle) => {
        // Child workflow started successfully
        // Can wait for result later if needed
        const result = await handle.result().toPromise();
      },
      Error: (error) => {
        console.error('Failed to start notification:', error);
      },
    });

    return { success: true };
  },
});
```

### Error Handling

Child workflow errors are returned as `ChildWorkflowError`:

```typescript
const result = await context.executeChildWorkflow(myContract, 'processPayment', {
  workflowId: 'payment-123',
  args: { amount: 100 }
}).toPromise();

result.match({
  Ok: (output) => {
    // Child workflow completed successfully
    console.log('Transaction ID:', output.transactionId);
  },
  Error: (error) => {
    // Handle child workflow errors
    if (error instanceof ChildWorkflowNotFoundError) {
      console.error('Workflow not found in contract');
    } else {
      console.error('Child workflow failed:', error.message);
    }
  },
});
```

## Best Practices

### 1. Separate Activity Files

Organize activities by domain:

```typescript
// activities/payment.ts
export const paymentActivities = {
  processPayment: async ({ customerId, amount }) => { /* ... */ },
  refundPayment: async ({ transactionId }) => { /* ... */ }
};

// activities/email.ts
export const emailActivities = {
  sendEmail: async ({ to, subject, body }) => { /* ... */ }
};

// activities/index.ts
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { paymentActivities } from './payment';
import { emailActivities } from './email';

export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    ...paymentActivities,
    ...emailActivities
  }
});
```

### 2. Use Dependency Injection

Make activities testable:

```typescript
export const createActivities = (services: {
  emailService: EmailService;
  paymentGateway: PaymentGateway;
}) => declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: async ({ to, subject, body }) => {
      await services.emailService.send({ to, subject, body });
      return { sent: true };
    },
    processPayment: async ({ customerId, amount }) => {
      const txId = await services.paymentGateway.charge(customerId, amount);
      return { transactionId: txId, success: true };
    }
  }
});
```

### 3. Error Handling

Handle errors appropriately:

```typescript
export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    processPayment: async ({ customerId, amount }) => {
      try {
        const txId = await paymentGateway.charge(customerId, amount);
        return { transactionId: txId, success: true };
      } catch (error) {
        // Log error
        logger.error('Payment failed', error);

        // Return typed error response
        return { transactionId: '', success: false };
      }
    }
  }
});
```

## See Also

- [Entry Points Architecture](/guide/entry-points)
- [Activity Handler Types](/guide/activity-handlers)
- [Examples](/examples/)
