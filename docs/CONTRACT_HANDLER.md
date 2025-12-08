# Worker Implementation

The `@temporal-contract/worker` package provides two main functions for implementing Temporal workers with full type safety.

## Overview

### Two-Part Architecture

1. **`createActivitiesHandler`** - Implements all activities (global + workflow-specific) for the Temporal Worker
2. **`createWorkflow`** - Implements individual workflows in separate files with typed context

This separation follows Temporal's architecture where workflows must be loaded via `workflowsPath`.

## Basic Usage

### 1. Activities Handler

Create a handler for all activities (used by the Worker):

```typescript
// activities/index.ts
import { createActivitiesHandler } from '@temporal-contract/worker';
import myContract from '../contract';

export const activitiesHandler = createActivitiesHandler({
  contract: myContract,
  activities: {
    // Global activities (available in all workflows)
    sendEmail: async (to, subject, body) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },
    
    logEvent: async (eventName, data) => {
      await logger.log(eventName, data);
      return { logged: true };
    },
    
    // Workflow-specific activities
    validateInventory: async (orderId) => {
      const available = await inventoryDB.check(orderId);
      return { available };
    },
    
    chargePayment: async (customerId, amount) => {
      const transactionId = await paymentGateway.charge(customerId, amount);
      return { transactionId, success: true };
    },
  },
});
```

### 2. Workflow Implementations

Create each workflow in its own file:

```typescript
// workflows/processOrder.ts
import { createWorkflow } from '@temporal-contract/worker';
import myContract from '../contract';

export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (context, orderId, customerId) => {
    // context.activities: typed activities (workflow + global)
    // context.info: WorkflowInfo
    
    const inventory = await context.activities.validateInventory(orderId);
    
    if (!inventory.available) {
      throw new Error('Out of stock');
    }
    
    const payment = await context.activities.chargePayment(customerId, 100);
    
    // Global activity
    await context.activities.sendEmail(
      customerId,
      'Order processed',
      'Your order has been processed'
    );
    
    return {
      orderId,
      status: payment.success ? 'success' : 'failed',
      transactionId: payment.transactionId,
    };
  },
  activityOptions: {
    startToCloseTimeout: '1 minute',
  },
});
```

```typescript
// workflows/cancelOrder.ts
import { createWorkflow } from '@temporal-contract/worker';
import myContract from '../contract';

export const cancelOrder = createWorkflow({
  definition: myContract.workflows.cancelOrder,
  contract: myContract,
  implementation: async (context, orderId) => {
    await context.activities.sendEmail(
      'customer@example.com',
      'Order cancelled',
      `Order ${orderId} cancelled`
    );
    
    return { orderId, cancelled: true };
  },
});
```

### 3. Worker Setup

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import { activitiesHandler } from './activities';

const worker = await Worker.create({
  // Workflows are loaded from file system
  workflowsPath: require.resolve('./workflows'),
  
  // Activities from handler
  activities: activitiesHandler.activities,
  
  // Task queue from contract
  taskQueue: activitiesHandler.contract.taskQueue,
});

await worker.run();
```

## File Structure

Recommended organization:

```
src/
├── contract.ts           # Contract definition
├── activities/
│   ├── index.ts         # Activities handler
│   ├── email.ts         # Email activities
│   ├── inventory.ts     # Inventory activities
│   └── payment.ts       # Payment activities
├── workflows/
│   ├── processOrder.ts  # processOrder workflow
│   └── cancelOrder.ts   # cancelOrder workflow
└── worker.ts            # Worker setup
```

### contract.ts

```typescript
import { z } from 'zod';
import { activity, workflow, contract } from '@temporal-contract/contract';

export default contract({
  taskQueue: 'my-service',
  
  // Global activities (available in all workflows)
  activities: {
    sendEmail: activity({
      input: z.tuple([z.string(), z.string(), z.string()]),
      output: z.object({ sent: z.boolean() }),
    }),
    logEvent: activity({
      input: z.tuple([z.string(), z.any()]),
      output: z.object({ logged: z.boolean() }),
    }),
  },
  
  workflows: {
    processOrder: workflow({
      input: z.tuple([z.string(), z.string()]),
      output: z.object({
        orderId: z.string(),
        status: z.string(),
        transactionId: z.string(),
      }),
      
      // Workflow-specific activities
      activities: {
        validateInventory: activity({
          input: z.tuple([z.string()]),
          output: z.object({ available: z.boolean() }),
        }),
        chargePayment: activity({
          input: z.tuple([z.string(), z.number()]),
          output: z.object({ transactionId: z.string(), success: z.boolean() }),
        }),
      },
    }),
    
    cancelOrder: workflow({
      input: z.tuple([z.string()]),
      output: z.object({ orderId: z.string(), cancelled: z.boolean() }),
    }),
  },
});
```

### activities/index.ts

```typescript
import { createActivitiesHandler } from '@temporal-contract/worker';
import myContract from '../contract';
import { sendEmail, logEvent } from './email';
import { validateInventory } from './inventory';
import { chargePayment } from './payment';

export const activitiesHandler = createActivitiesHandler({
  contract: myContract,
  activities: {
    // Global activities
    sendEmail,
    logEvent,
    
    // Workflow-specific activities
    validateInventory,
    chargePayment,
  },
});
```

### activities/email.ts

```typescript
export async function sendEmail(to: string, subject: string, body: string) {
  await emailService.send({ to, subject, body });
  return { sent: true };
}

export async function logEvent(eventName: string, data: any) {
  await logger.log(eventName, data);
  return { logged: true };
}
```

### workflows/processOrder.ts

```typescript
import { createWorkflow } from '@temporal-contract/worker';
import myContract from '../contract';

export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (context, orderId, customerId) => {
    const inventory = await context.activities.validateInventory(orderId);
    
    if (!inventory.available) {
      throw new Error('Out of stock');
    }
    
    const payment = await context.activities.chargePayment(customerId, 100);
    
    await context.activities.sendEmail(
      customerId,
      'Order processed',
      'Your order has been processed'
    );
    
    return {
      orderId,
      status: payment.success ? 'success' : 'failed',
      transactionId: payment.transactionId,
    };
  },
  activityOptions: {
    startToCloseTimeout: '1 minute',
  },
});
```

### worker.ts

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

## Type Safety

### Compile-Time Validation for Activities

TypeScript ensures all activities are implemented:

```typescript
const activitiesHandler = createActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: /* ... */,
    validateInventory: /* ... */,
    // ❌ Error: Properties 'logEvent' and 'chargePayment' are missing
  },
});
```

### Type Inference for Workflows

Use TypeScript's type inference to keep workflow implementations typed:

```typescript
import type { WorkflowContext, WorkflowImplementation } from '@temporal-contract/worker';
import type myContract from '../contract';

type ProcessOrderWorkflow = typeof myContract.workflows.processOrder;
type Contract = typeof myContract;

// Option 1: Function signature with explicit types
export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (
    context: WorkflowContext<ProcessOrderWorkflow, Contract>,
    orderId: string,
    customerId: string
  ) => {
    // Full type inference
  },
});

// Option 2: Using WorkflowImplementation type
const processOrderImpl: WorkflowImplementation<ProcessOrderWorkflow, Contract> = 
  async (context, orderId, customerId) => {
    // Everything typed
  };

export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: processOrderImpl,
});
```

## Automatic Validation

All implementations are wrapped with Zod validation:

### Workflow Validation

```typescript
export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (context, orderId, customerId) => {
    // 1. Input validated: [orderId, customerId] parsed with input schema
    // 2. Your implementation runs
    // 3. Output validated: result parsed with output schema
    return { orderId, status: 'success', transactionId: '123' };
  },
});
```

### Activity Validation

```typescript
const activitiesHandler = createActivitiesHandler({
  contract: myContract,
  activities: {
    chargePayment: async (customerId, amount) => {
      // 1. Input validated: [customerId, amount] parsed with input schema
      // 2. Your implementation runs
      // 3. Output validated: result parsed with output schema
      return { transactionId: '123', success: true };
    },
  },
});
```

### Network Boundary Validation

Activity calls from workflows are validated at network boundaries:

```typescript
// Inside workflow
const payment = await context.activities.chargePayment(customerId, 100);
// 1. Arguments validated before serialization (workflow → activity)
// 2. Sent over network to activity
// 3. Result validated after deserialization (activity → workflow)
```

This ensures **complete type safety and data integrity** across all network boundaries.

## Best Practices

### 1. Separate Files for Workflows

Each workflow should be in its own file for better organization and to work properly with Temporal's `workflowsPath`:

```typescript
// ✅ Good: Each workflow in its own file
// workflows/processOrder.ts
export const processOrder = createWorkflow({ /* ... */ });

// workflows/cancelOrder.ts
export const cancelOrder = createWorkflow({ /* ... */ });
```

### 2. Group Activities by Domain

Organize activities by domain in separate files:

```typescript
// activities/email.ts
export async function sendEmail(to, subject, body) { /* ... */ }
export async function sendSMS(to, message) { /* ... */ }

// activities/payment.ts
export async function chargePayment(customerId, amount) { /* ... */ }
export async function refundPayment(transactionId) { /* ... */ }

// activities/inventory.ts
export async function validateInventory(orderId) { /* ... */ }
export async function reserveInventory(orderId) { /* ... */ }
```

### 3. Use Type Annotations

Add explicit types for better IDE support:

```typescript
import type { WorkflowContext } from '@temporal-contract/worker';

export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (
    context: WorkflowContext<
      typeof myContract.workflows.processOrder,
      typeof myContract
    >,
    orderId: string,
    customerId: string
  ) => {
    // Full type inference and autocomplete
  },
});
```

### 4. Configure Activity Options

Set sensible defaults for workflow activities:

```typescript
export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (context, orderId, customerId) => { /* ... */ },
  activityOptions: {
    startToCloseTimeout: '1 minute',
    retry: {
      maximumAttempts: 3,
      initialInterval: '1s',
      backoffCoefficient: 2,
      maximumInterval: '10s',
    },
  },
});
```

## Multiple Contracts

If you have multiple contracts, create separate handlers and workers:

```typescript
// contracts/orders.ts
export default contract({
  taskQueue: 'orders',
  workflows: { /* ... */ },
});

// contracts/payments.ts
export default contract({
  taskQueue: 'payments',
  workflows: { /* ... */ },
});

// activities/orders.ts
import ordersContract from '../contracts/orders';

export const ordersActivitiesHandler = createActivitiesHandler({
  contract: ordersContract,
  activities: { /* ... */ },
});

// activities/payments.ts
import paymentsContract from '../contracts/payments';

export const paymentsActivitiesHandler = createActivitiesHandler({
  contract: paymentsContract,
  activities: { /* ... */ },
});

// workflows/orders/processOrder.ts
import ordersContract from '../../contracts/orders';

export const processOrder = createWorkflow({
  definition: ordersContract.workflows.processOrder,
  contract: ordersContract,
  implementation: async (context, orderId) => { /* ... */ },
});

// worker.ts - Start separate workers
const ordersWorker = await Worker.create({
  workflowsPath: require.resolve('./workflows/orders'),
  activities: ordersActivitiesHandler.activities,
  taskQueue: ordersActivitiesHandler.contract.taskQueue,
});

const paymentsWorker = await Worker.create({
  workflowsPath: require.resolve('./workflows/payments'),
  activities: paymentsActivitiesHandler.activities,
  taskQueue: paymentsActivitiesHandler.contract.taskQueue,
});

await Promise.all([ordersWorker.run(), paymentsWorker.run()]);
```
