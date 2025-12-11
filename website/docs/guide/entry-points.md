# Entry Points Architecture

Understanding how temporal-contract handles the separation between activities and workflows.

## Why Separate Entry Points?

Temporal requires workflows to be loaded via `workflowsPath` for sandboxing and determinism. This architectural decision means:

1. **Activities** are loaded directly into the Worker
2. **Workflows** are loaded from a separate file path

temporal-contract respects this architecture while providing type safety across both.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│            Your Application             │
├─────────────────────────────────────────┤
│                                         │
│  Contract Definition (contract.ts)      │
│  ↓                                      │
│  Activities Handler (activities.ts)     │
│  Workflows (workflows/*.ts)             │
│  ↓                                      │
│  Worker Setup (worker.ts)               │
│                                         │
└─────────────────────────────────────────┘
```

## File Structure

Recommended project structure:

```
src/
├── contracts/
│   └── order.contract.ts       # Contract definition
├── activities/
│   ├── payment.activities.ts   # Payment activities
│   ├── email.activities.ts     # Email activities
│   └── index.ts               # Activities handler
├── workflows/
│   ├── order.workflow.ts      # Order workflow
│   └── shipment.workflow.ts   # Shipment workflow
└── worker.ts                  # Worker setup
```

## Contract Definition

Define your contract once:

```typescript
// contracts/order.contract.ts
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

export const orderContract = defineContract({
  taskQueue: 'orders',
  
  activities: {
    sendEmail: {
      input: z.object({ to: z.string(), body: z.string() }),
      output: z.object({ sent: z.boolean() })
    }
  },
  
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),
      activities: {
        processPayment: {
          input: z.object({ amount: z.number() }),
          output: z.object({ transactionId: z.string() })
        }
      }
    }
  }
});
```

## Activities Entry Point

Create a single activities handler:

```typescript
// activities/index.ts
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { orderContract } from '../contracts/order.contract';

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    sendEmail: async ({ to, body }) => {
      await emailService.send({ to, body });
      return { sent: true };
    },
    processPayment: async ({ amount }) => {
      const txId = await paymentGateway.charge(amount);
      return { transactionId: txId };
    }
  }
});
```

## Workflows Entry Point

Create separate workflow files:

```typescript
// workflows/order.workflow.ts
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { orderContract } from '../contracts/order.contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, { orderId }) => {
    const payment = await context.activities.processPayment({ 
      amount: 100 
    });
    
    await context.activities.sendEmail({
      to: 'customer@example.com',
      body: `Order ${orderId} processed`
    });
    
    return { success: true };
  }
});
```

## Worker Setup

Wire everything together:

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import { activities } from './activities';

const worker = await Worker.create({
  // Workflows loaded from path (Temporal requirement)
  workflowsPath: require.resolve('./workflows/order.workflow'),
  
  // Activities loaded directly
  activities: activities.activities,
  
  // Task queue from contract
  taskQueue: activities.contract.taskQueue,
});

await worker.run();
```

## Multiple Workflows

For multiple workflows, export them all from a single file:

```typescript
// workflows/index.ts
export * from './order.workflow';
export * from './shipment.workflow';
export * from './refund.workflow';
```

```typescript
// worker.ts
const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activities.activities,
  taskQueue: activities.contract.taskQueue,
});
```

## Type Safety Across Boundaries

Despite the separation, type safety is maintained:

### From Contract to Activities

```typescript
// Contract defines the shape
const contract = defineContract({
  activities: {
    processPayment: {
      input: z.object({ amount: z.number() }),
      output: z.object({ transactionId: z.string() })
    }
  }
});

// Activities handler must match
declareActivitiesHandler({
  contract,
  activities: {
    processPayment: async ({ amount }) => {
      // ✅ amount is number
      return { transactionId: 'TXN-123' };
      // ✅ Must return { transactionId: string }
    }
  }
});
```

### From Contract to Workflows

```typescript
// Workflow context is typed from contract
declareWorkflow({
  workflowName: 'processOrder',
  contract,
  implementation: async (context, input) => {
    // ✅ TypeScript knows processPayment exists
    const result = await context.activities.processPayment({
      amount: 100  // ✅ Type checked
    });
    
    // ✅ result.transactionId is string
    console.log(result.transactionId);
  }
});
```

## Benefits of This Architecture

### 1. Type Safety

Full TypeScript inference across all boundaries.

### 2. Validation

Automatic validation at:
- Workflow entry/exit
- Activity calls
- Client requests

### 3. Temporal Compliance

Respects Temporal's architecture requirements.

### 4. Testability

Activities and workflows can be tested independently:

```typescript
// Test activities directly
const result = await activities.activities.processPayment({ 
  amount: 100 
});

// Test workflows with mock context
const workflow = processOrder.implementation;
const mockContext = createMockContext();
await workflow(mockContext, { orderId: 'ORD-123' });
```

### 5. Organization

Clear separation of concerns with organized file structure.

## Common Patterns

### Pattern 1: Shared Activities

```typescript
// activities/shared.ts
export const sharedActivities = {
  sendEmail: async ({ to, body }) => ({ sent: true }),
  logEvent: async ({ event }) => ({ logged: true })
};

// activities/order.ts
import { sharedActivities } from './shared';

export const orderActivities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    ...sharedActivities,
    processPayment: async ({ amount }) => ({ transactionId: 'TXN' })
  }
});
```

### Pattern 2: Activity Composition

```typescript
// activities/index.ts
const baseActivities = {
  validateInput: async ({ data }) => ({ valid: true })
};

const paymentActivities = {
  processPayment: async ({ amount }) => ({ transactionId: 'TXN' })
};

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    ...baseActivities,
    ...paymentActivities
  }
});
```

## See Also

- [Worker Implementation](/guide/worker-implementation)
- [Activity Handler Types](/guide/activity-handlers)
- [Getting Started](/guide/getting-started)
