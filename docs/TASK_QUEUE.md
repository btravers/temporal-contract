# Task Queue Architecture

This document explains why the task queue is defined at the contract level in `temporal-contract`.

## Overview

In `temporal-contract`, the **task queue is a contract-level property**, not a workflow-level property. This design choice reflects how Temporal applications are typically structured and deployed.

## Concept

```
Contract (Task Queue: "order-service")
├── workflows
│   ├── processOrder
│   ├── cancelOrder
│   └── refundOrder
└── activities
    ├── chargePayment
    ├── updateInventory
    └── sendNotification

Worker (Polls: "order-service")
└── Handles ALL workflows and activities from the contract
```

All workflows and activities in a contract share the same task queue because they:
- Form a cohesive service boundary
- Are deployed together as a single unit
- Share common dependencies and context
- Scale together based on workload

## Definition

### Contract with Task Queue

```typescript
import { z } from 'zod';
import { contract, workflow, activity } from '@temporal-contract/contract';

const orderContract = contract({
  // Task queue defined once for the entire contract
  taskQueue: 'order-service',
  
  workflows: {
    processOrder: workflow({
      input: z.tuple([z.string()]),
      output: z.object({ status: z.string() }),
      // No taskQueue here - inherited from contract
    }),
    
    cancelOrder: workflow({
      input: z.tuple([z.string()]),
      output: z.object({ cancelled: z.boolean() }),
      // Same task queue as processOrder
    }),
  },
  
  activities: {
    chargePayment: activity({
      input: z.tuple([z.string(), z.number()]),
      output: z.object({ charged: z.boolean() }),
    }),
  },
});
```

## Worker Configuration

A single worker polls the contract's task queue and handles all workflows and activities:

```typescript
import { Worker } from '@temporalio/worker';
import orderContract from './contracts/order';
import { processOrder, cancelOrder } from './workflows';
import { chargePayment, updateInventory } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: {
    chargePayment,
    updateInventory,
    sendNotification,
  },
  // Use the contract's task queue
  taskQueue: orderContract.taskQueue,
});

await worker.run();
```

## Client Usage

The client automatically uses the contract's task queue when starting workflows:

```typescript
import { createClient } from '@temporal-contract/client';
import orderContract from './contracts/order';

const client = await createClient(orderContract);

// Task queue is automatically set from the contract
await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: ['ORD-123'],
});

// Same task queue for all workflows
await client.executeWorkflow('cancelOrder', {
  workflowId: 'cancel-456',
  args: ['ORD-456'],
});
```

## Why Contract-Level?

### 1. Service Boundary

A contract represents a **service boundary** in your architecture:

```
E-commerce System
├── Order Service (contract: orderContract, taskQueue: "order-service")
│   ├── processOrder
│   ├── cancelOrder
│   └── refundOrder
├── Inventory Service (contract: inventoryContract, taskQueue: "inventory-service")
│   ├── reserveItems
│   ├── releaseReservation
│   └── updateStock
└── Notification Service (contract: notificationContract, taskQueue: "notification-service")
    ├── sendEmail
    ├── sendSMS
    └── pushNotification
```

Each service:
- Has its own contract
- Has its own task queue
- Deploys independently
- Scales independently

### 2. Deployment Unit

Contracts are deployed together:

```bash
# Deploy order service
npm run deploy:order-service
→ Deploys all workflows and activities
→ Worker polls "order-service" task queue

# Deploy inventory service
npm run deploy:inventory-service
→ Deploys all workflows and activities
→ Worker polls "inventory-service" task queue
```

### 3. Resource Management

Workers scale based on the task queue load:

```typescript
// Scale order service independently
const orderWorker1 = await Worker.create({
  taskQueue: 'order-service',
  // ... workflows and activities
});

const orderWorker2 = await Worker.create({
  taskQueue: 'order-service',
  // ... same workflows and activities (load balanced)
});

// Scale inventory service independently
const inventoryWorker = await Worker.create({
  taskQueue: 'inventory-service',
  // ... different workflows and activities
});
```

### 4. Simplified Configuration

Instead of specifying task queue for each workflow:

❌ **Bad**: Task queue per workflow
```typescript
const myContract = contract({
  workflows: {
    workflow1: workflow({
      taskQueue: 'my-service', // Repetitive
      // ...
    }),
    workflow2: workflow({
      taskQueue: 'my-service', // Repetitive
      // ...
    }),
    workflow3: workflow({
      taskQueue: 'my-service', // Repetitive
      // ...
    }),
  },
});
```

✅ **Good**: Task queue once per contract
```typescript
const myContract = contract({
  taskQueue: 'my-service', // DRY principle
  workflows: {
    workflow1: workflow({ /* ... */ }),
    workflow2: workflow({ /* ... */ }),
    workflow3: workflow({ /* ... */ }),
  },
});
```

## Multiple Contracts

If you need different task queues, create separate contracts:

```typescript
// contracts/order.ts
export const orderContract = contract({
  taskQueue: 'order-service',
  workflows: {
    processOrder: workflow({ /* ... */ }),
    cancelOrder: workflow({ /* ... */ }),
  },
});

// contracts/payment.ts
export const paymentContract = contract({
  taskQueue: 'payment-service',
  workflows: {
    chargeCustomer: workflow({ /* ... */ }),
    refundCustomer: workflow({ /* ... */ }),
  },
});

// contracts/notification.ts
export const notificationContract = contract({
  taskQueue: 'notification-service',
  workflows: {
    sendEmail: workflow({ /* ... */ }),
    sendSMS: workflow({ /* ... */ }),
  },
});
```

Deploy separate workers for each:

```typescript
// workers/order-worker.ts
const orderWorker = await Worker.create({
  taskQueue: orderContract.taskQueue,
  // ... order workflows and activities
});

// workers/payment-worker.ts
const paymentWorker = await Worker.create({
  taskQueue: paymentContract.taskQueue,
  // ... payment workflows and activities
});

// workers/notification-worker.ts
const notificationWorker = await Worker.create({
  taskQueue: notificationContract.taskQueue,
  // ... notification workflows and activities
});
```

## Cross-Contract Workflow Communication

Workflows from different contracts can communicate using child workflows:

```typescript
// Order workflow calls Payment workflow
const processOrder = createWorkflow({
  definition: orderContract.workflows.processOrder,
  contract: orderContract,
  implementation: async (context, orderId, amount) => {
    // Start a child workflow from another contract
    const payment = await startChild(
      'chargeCustomer', // From paymentContract
      {
        workflowId: `payment-${orderId}`,
        taskQueue: 'payment-service', // Different task queue
        args: [orderId, amount],
      }
    );
    
    const paymentResult = await payment.result();
    
    return { status: 'paid' };
  },
});
```

## Environment-Specific Task Queues

Use environment variables for different deployments:

```typescript
const orderContract = contract({
  taskQueue: process.env.TASK_QUEUE_PREFIX 
    ? `${process.env.TASK_QUEUE_PREFIX}-order-service`
    : 'order-service',
  workflows: { /* ... */ },
});

// Development: order-service
// Staging: staging-order-service
// Production: prod-order-service
```

## Monitoring and Metrics

Task queues at the contract level make monitoring simpler:

```typescript
// Monitor by service (contract)
const metrics = await temporalClient.workflowService.describeTaskQueue({
  namespace: 'default',
  taskQueue: orderContract.taskQueue,
});

console.log(`Order Service: ${metrics.pollers.length} workers`);
```

## Best Practices

### 1. One Task Queue Per Service

✅ **Good**: Logical service grouping
```typescript
const userContract = contract({
  taskQueue: 'user-service',
  workflows: {
    registerUser: workflow({ /* ... */ }),
    updateProfile: workflow({ /* ... */ }),
    deleteAccount: workflow({ /* ... */ }),
  },
});
```

❌ **Bad**: Mixing unrelated workflows
```typescript
const mixedContract = contract({
  taskQueue: 'everything',
  workflows: {
    registerUser: workflow({ /* ... */ }),
    processPayment: workflow({ /* ... */ }), // Different domain
    sendEmail: workflow({ /* ... */ }),      // Different domain
  },
});
```

### 2. Name Task Queues After Services

Use descriptive, service-oriented names:

✅ **Good**:
- `order-service`
- `payment-service`
- `notification-service`
- `inventory-service`

❌ **Bad**:
- `queue1`
- `workflows`
- `prod`
- `main`

### 3. Separate Contracts for Different Scales

If services have different scaling needs, use separate contracts:

```typescript
// High-throughput service
const orderContract = contract({
  taskQueue: 'order-service', // Many workers
  workflows: { /* ... */ },
});

// Low-throughput service
const reportContract = contract({
  taskQueue: 'report-service', // Few workers
  workflows: { /* ... */ },
});
```

### 4. Consider Team Ownership

Align contracts with team boundaries:

```typescript
// Team: Payments
const paymentContract = contract({
  taskQueue: 'payment-service',
  workflows: { /* owned by payments team */ },
});

// Team: Orders
const orderContract = contract({
  taskQueue: 'order-service',
  workflows: { /* owned by orders team */ },
});
```

## Summary

Task queue at the contract level:

- ✅ Represents service boundaries
- ✅ Simplifies deployment and configuration
- ✅ Enables independent scaling
- ✅ Reduces repetition (DRY)
- ✅ Aligns with Temporal best practices
- ✅ Improves monitoring and observability
- ✅ Maps to team ownership

For different task queues, create separate contracts rather than overriding at the workflow level.
