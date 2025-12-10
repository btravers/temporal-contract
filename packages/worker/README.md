# @temporal-contract/worker

> Type-safe worker implementation for Temporal

## Installation

```bash
pnpm add @temporal-contract/worker @temporal-contract/contract @temporalio/workflow zod
```

## Important: Separate Entry Points

Use **separate imports** for better tree-shaking:

- **`@temporal-contract/worker/activity`** — For activity files
- **`@temporal-contract/worker/workflow`** — For workflow files

## Quick Start

### 1. Implement Activities

```typescript
// activities.ts
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { myContract } from './contract';

export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: async ({ to, subject, body }) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },
    processPayment: async ({ customerId, amount }) => {
      const txId = await paymentGateway.charge(customerId, amount);
      return { transactionId: txId, success: true };
    },
  },
});
```

### 2. Implement Workflows

```typescript
// workflows.ts
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { myContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, { orderId, customerId }) => {
    const payment = await context.activities.processPayment({ customerId, amount: 100 });
    await context.activities.sendEmail({ to: customerId, subject: 'Confirmed', body: 'Done!' });

    return {
      status: payment.success ? 'success' : 'failed',
      transactionId: payment.transactionId,
    };
  },
});
```

### 3. Start Worker

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import { activities } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activities.activities,
  taskQueue: activities.contract.taskQueue,
});

await worker.run();
```

## Features

✅ **Automatic validation** — Input/output validated with Zod at network boundaries  
✅ **Type inference** — Full TypeScript inference from contract  
✅ **Typed context** — Activities and workflow info fully typed  
✅ **Signals, queries, updates** — Type-safe handlers with validation

## Utility Types

For cleaner activity signatures:

```typescript
import type { ActivityHandler, WorkflowActivityHandler } from '@temporal-contract/contract';

const sendEmail: ActivityHandler<typeof myContract, 'sendEmail'> =
  async ({ to, subject, body }) => {
    // Fully typed without explicit annotations
    return { sent: true };
  };
```

See [Activity Handlers documentation](../../docs/ACTIVITY_HANDLERS.md) for details.

## Error Handling

Custom error classes with contextual info:

```typescript
import { ActivityDefinitionNotFoundError } from '@temporal-contract/worker';

// Errors include helpful context
if (error instanceof ActivityDefinitionNotFoundError) {
  console.error('Not found:', error.activityName);
  console.error('Available:', error.availableActivities);
}
```

---

## Learn More

- [Main README](../../README.md) — Quick start guide
- [Worker Implementation](../../docs/CONTRACT_HANDLER.md) — Complete guide
- [Entry Points](../../docs/ENTRY_POINTS.md) — Why separate entry points
- [Activity Handlers](../../docs/ACTIVITY_HANDLERS.md) — Type utilities

## License

MIT
