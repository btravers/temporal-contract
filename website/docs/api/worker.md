# @temporal-contract/worker

Type-safe worker implementation with Result/Future pattern for explicit error handling.

## Installation

```bash
pnpm add @temporal-contract/worker @temporal-contract/boxed
```

## Features

- Type-safe workflow and activity implementations
- Result/Future pattern for activities
- Automatic validation at network boundaries
- Re-exports boxed utilities for convenience

## Entry Points

### `@temporal-contract/worker/activity`

For implementing activities:

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import type {
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferActivity,
  ActivityHandler,
  WorkflowActivityHandler
} from '@temporal-contract/worker/activity';
```

### `@temporal-contract/worker/workflow`

For implementing workflows:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import type {
  WorkerInferWorkflow,
  WorkerInferSignal,
  WorkerInferQuery,
  WorkerInferUpdate,
  WorkflowContext
} from '@temporal-contract/worker/workflow';
```

### Workflow Context

The workflow context provides access to activities and child workflows:

```typescript
export const myWorkflow = declareWorkflow({
  workflowName: 'myWorkflow',
  contract: myContract,
  implementation: async (context, input) => {
    // Access activities
    await context.activities.sendEmail({ to: 'user@example.com' });

    // Execute child workflow
    const result = await context.executeChildWorkflow(myContract, 'childWorkflow', {
      workflowId: 'child-123',
      args: { data: input.data }
    });

    // Start child workflow without waiting
    const handle = await context.startChildWorkflow(myContract, 'backgroundTask', {
      workflowId: 'task-123',
      args: { taskId: input.taskId }
    });

    return { success: true };
  },
});
```

## Type Utilities

### Input/Output Inference

Extract input and output types from definitions (worker perspective):

```typescript
import type { WorkerInferInput, WorkerInferOutput } from '@temporal-contract/worker/activity';

const activityDef = {
  input: z.object({ orderId: z.string() }),
  output: z.object({ success: z.boolean() })
};

// Worker receives parsed input (z.output)
type Input = WorkerInferInput<typeof activityDef>;  // { orderId: string }

// Worker returns raw output (z.input)
type Output = WorkerInferOutput<typeof activityDef>;  // { success: boolean }
```

### Handler Types

Extract handler function signatures:

```typescript
import type { WorkerInferActivity } from '@temporal-contract/worker/activity';

const activityDef = {
  input: z.object({ orderId: z.string() }),
  output: z.object({ success: z.boolean() })
};

// Activity handler signature
type Handler = WorkerInferActivity<typeof activityDef>;
// (args: { orderId: string }) => Promise<{ success: boolean }>
```

### Contract-Level Types

Extract types for entire contracts:

```typescript
import type {
  WorkerInferActivities,
  WorkerInferWorkflows
} from '@temporal-contract/worker/activity';

// All activities from contract
type Activities = WorkerInferActivities<typeof myContract>;

// All workflows from contract
type Workflows = WorkerInferWorkflows<typeof myContract>;
```

### Activity Handler Utilities

Type-safe activity handler extraction:

```typescript
import type { ActivityHandler, WorkflowActivityHandler } from '@temporal-contract/worker/activity';

// Global activity handler
type LogHandler = ActivityHandler<typeof myContract, 'log'>;

// Workflow-specific activity handler
type PaymentHandler = WorkflowActivityHandler<
  typeof myContract,
  'processOrder',
  'processPayment'
>;
```

## API Reference

See [Worker Implementation Guide](/guide/worker-implementation) and [Result Pattern Guide](/guide/result-pattern).
