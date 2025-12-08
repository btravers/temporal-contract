# Contract Handler

The contract handler is the core feature of `@temporal-contract/worker`. It provides **complete compile-time validation** that all workflows and activities (global and workflow-specific) are correctly implemented.

## Overview

`createContractHandler()` takes your contract definition and raw implementations, then:
1. **Validates at compile-time** that all workflows and activities are implemented
2. **Wraps all implementations** with automatic Zod validation (input/output)
3. **Creates typed workflow contexts** with access to activities
4. **Returns ready-to-use implementations** for Temporal Worker

## Basic Usage

```typescript
import { createContractHandler } from '@temporal-contract/worker';
import { Worker } from '@temporalio/worker';
import myContract from './contract';

// Create handler with all implementations
const handler = createContractHandler({
  contract: myContract,
  
  // All workflows must be implemented
  workflows: {
    processOrder: async (context, orderId, customerId) => {
      // context.activities: typed activities (workflow + global)
      // context.info: WorkflowInfo
      const inventory = await context.activities.validateInventory(orderId);
      const payment = await context.activities.chargePayment(customerId, 100);
      
      // Global activity
      await context.activities.sendEmail(
        customerId,
        'Order processed',
        'Your order has been processed'
      );
      
      return {
        orderId,
        status: 'success',
        transactionId: payment.transactionId,
      };
    },
    
    cancelOrder: async (context, orderId) => {
      await context.activities.sendEmail(
        'customer@example.com',
        'Order cancelled',
        `Order ${orderId} cancelled`
      );
      
      return { orderId, cancelled: true };
    },
  },
  
  // All activities must be implemented (global + workflow-specific)
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
  
  // Optional: default activity options for all workflows
  activityOptions: {
    startToCloseTimeout: '1 minute',
    retry: {
      maximumAttempts: 3,
    },
  },
});

// Use with Temporal Worker
const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: handler.activities,
  taskQueue: handler.contract.taskQueue,
});

await worker.run();
```

## File Structure

Recommended organization for a clean separation of concerns:

```
src/
├── contract.ts           # Contract definition
├── workflows/
│   ├── index.ts         # Handler creation and exports
│   ├── processOrder.ts  # processOrder implementation
│   └── cancelOrder.ts   # cancelOrder implementation
├── activities/
│   ├── index.ts         # All activity implementations
│   ├── email.ts         # sendEmail implementation
│   ├── inventory.ts     # validateInventory implementation
│   └── payment.ts       # chargePayment implementation
└── worker.ts            # Worker setup
```

### contract.ts

```typescript
import { z } from 'zod';
import { activity, workflow, contract } from '@temporal-contract/contract';

const sendEmail = activity({
  input: z.tuple([z.string(), z.string(), z.string()]),
  output: z.object({ sent: z.boolean() }),
});

const logEvent = activity({
  input: z.tuple([z.string(), z.any()]),
  output: z.object({ logged: z.boolean() }),
});

export default contract({
  taskQueue: 'my-service',
  activities: {
    sendEmail,
    logEvent,
  },
  workflows: {
    processOrder: workflow({
      input: z.tuple([z.string(), z.string()]),
      output: z.object({
        orderId: z.string(),
        status: z.string(),
        transactionId: z.string(),
      }),
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

### workflows/processOrder.ts

```typescript
import type { WorkflowContext } from '@temporal-contract/worker';
import type myContract from '../contract';

type ProcessOrderWorkflow = typeof myContract.workflows.processOrder;
type Contract = typeof myContract;

export async function processOrder(
  context: WorkflowContext<ProcessOrderWorkflow, Contract>,
  orderId: string,
  customerId: string
) {
  // Fully typed context with activities
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
    status: 'success',
    transactionId: payment.transactionId,
  };
}
```

### workflows/index.ts

```typescript
import { createContractHandler } from '@temporal-contract/worker';
import myContract from '../contract';
import { processOrder } from './processOrder';
import { cancelOrder } from './cancelOrder';
import * as activities from '../activities';

export const handler = createContractHandler({
  contract: myContract,
  workflows: {
    processOrder,
    cancelOrder,
  },
  activities,
  activityOptions: {
    startToCloseTimeout: '1 minute',
  },
});
```

### activities/index.ts

```typescript
import { sendEmail, logEvent } from './email';
import { validateInventory } from './inventory';
import { chargePayment } from './payment';

export {
  // Global activities
  sendEmail,
  logEvent,
  
  // Workflow-specific activities
  validateInventory,
  chargePayment,
};
```

### worker.ts

```typescript
import { Worker } from '@temporalio/worker';
import { handler } from './workflows';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: handler.activities,
  taskQueue: handler.contract.taskQueue,
});

await worker.run();
```

## Type Safety

### Compile-Time Validation

TypeScript will error if:

1. **Missing workflow implementation:**
```typescript
const handler = createContractHandler({
  contract: myContract,
  workflows: {
    processOrder: /* ... */,
    // ❌ Error: Property 'cancelOrder' is missing
  },
  activities: { /* ... */ },
});
```

2. **Missing activity implementation:**
```typescript
const handler = createContractHandler({
  contract: myContract,
  workflows: { /* ... */ },
  activities: {
    sendEmail: /* ... */,
    validateInventory: /* ... */,
    // ❌ Error: Properties 'logEvent' and 'chargePayment' are missing
  },
});
```

3. **Wrong implementation signature:**
```typescript
const handler = createContractHandler({
  contract: myContract,
  workflows: {
    processOrder: async (context, orderId: number) => {
      // ❌ Error: orderId should be string, not number
      return { orderId: '', status: '', transactionId: '' };
    },
  },
  activities: { /* ... */ },
});
```

4. **Wrong return type:**
```typescript
const handler = createContractHandler({
  contract: myContract,
  workflows: {
    processOrder: async (context, orderId, customerId) => {
      return { orderId, status: 'success' };
      // ❌ Error: Property 'transactionId' is missing
    },
  },
  activities: { /* ... */ },
});
```

### Type Inference Helpers

Use TypeScript's type inference to keep implementations typed:

```typescript
import type { WorkflowContext, RawWorkflowImplementation } from '@temporal-contract/worker';
import type myContract from './contract';

// Extract specific workflow type
type ProcessOrderWorkflow = typeof myContract.workflows.processOrder;
type Contract = typeof myContract;

// Use in function signature
export async function processOrder(
  context: WorkflowContext<ProcessOrderWorkflow, Contract>,
  orderId: string,
  customerId: string
) {
  // context is fully typed
  // arguments are fully typed
  // return type is inferred and validated
}

// Or use RawWorkflowImplementation
export const processOrder: RawWorkflowImplementation<
  ProcessOrderWorkflow,
  Contract
> = async (context, orderId, customerId) => {
  // Everything typed
};
```

## Automatic Validation

The handler wraps all implementations with Zod validation:

### Workflow Validation

```typescript
workflows: {
  processOrder: async (context, orderId, customerId) => {
    // 1. Input validated: [orderId, customerId] parsed with input schema
    // 2. Your implementation runs
    // 3. Output validated: result parsed with output schema
    return { orderId, status: 'success', transactionId: '123' };
  },
}
```

### Activity Validation

```typescript
activities: {
  chargePayment: async (customerId, amount) => {
    // 1. Input validated: [customerId, amount] parsed with input schema
    // 2. Your implementation runs
    // 3. Output validated: result parsed with output schema
    return { transactionId: '123', success: true };
  },
}
```

### Network Boundary Validation

Activity calls from workflows are also validated:

```typescript
// Inside workflow
const payment = await context.activities.chargePayment(customerId, 100);
// 1. Arguments validated before serialization (workflow → activity)
// 2. Sent over network to activity
// 3. Result validated after deserialization (activity → workflow)
```

This ensures **complete type safety and data integrity** across all network boundaries.

## Best Practices

### 1. Separate Implementation Files

Keep workflow and activity implementations in separate files for better organization:

```typescript
// workflows/processOrder.ts
export async function processOrder(context, orderId, customerId) {
  // Implementation
}

// workflows/index.ts
import { processOrder } from './processOrder';
import { cancelOrder } from './cancelOrder';

export const handler = createContractHandler({
  contract: myContract,
  workflows: { processOrder, cancelOrder },
  activities: { /* ... */ },
});
```

### 2. Use Type Annotations

Add explicit types to your implementations for better IDE support:

```typescript
import type { WorkflowContext } from '@temporal-contract/worker';

export async function processOrder(
  context: WorkflowContext<typeof myContract.workflows.processOrder, typeof myContract>,
  orderId: string,
  customerId: string
) {
  // Full type inference and autocomplete
}
```

### 3. Group Related Activities

Organize activities by domain:

```typescript
activities: {
  // Email domain
  sendEmail: emailService.send,
  sendSMS: emailService.sendSMS,
  
  // Payment domain
  chargePayment: paymentService.charge,
  refundPayment: paymentService.refund,
  
  // Inventory domain
  validateInventory: inventoryService.validate,
  reserveInventory: inventoryService.reserve,
}
```

### 4. Configure Activity Options

Set sensible defaults for all activities:

```typescript
const handler = createContractHandler({
  contract: myContract,
  workflows: { /* ... */ },
  activities: { /* ... */ },
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

If you have multiple contracts, create a handler for each:

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

// workers/orders.ts
import ordersContract from '../contracts/orders';

export const ordersHandler = createContractHandler({
  contract: ordersContract,
  workflows: { /* ... */ },
  activities: { /* ... */ },
});

// workers/payments.ts
import paymentsContract from '../contracts/payments';

export const paymentsHandler = createContractHandler({
  contract: paymentsContract,
  workflows: { /* ... */ },
  activities: { /* ... */ },
});

// Start separate workers
const ordersWorker = await Worker.create({
  workflowsPath: require.resolve('./workers/orders'),
  activities: ordersHandler.activities,
  taskQueue: ordersHandler.contract.taskQueue,
});

const paymentsWorker = await Worker.create({
  workflowsPath: require.resolve('./workers/payments'),
  activities: paymentsHandler.activities,
  taskQueue: paymentsHandler.contract.taskQueue,
});
```
