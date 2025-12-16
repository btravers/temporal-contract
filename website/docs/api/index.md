# API Reference

temporal-contract is organized into focused packages, each serving a specific purpose in building type-safe Temporal workflows.

## Packages Overview

### [@temporal-contract/contract](/api/contract)

**Core contract definition and type utilities**

- `defineContract()` - Define type-safe workflow contracts
- Type inference utilities
- Contract composition helpers

```bash
pnpm add @temporal-contract/contract
```

### [@temporal-contract/worker](/api/worker)

**Type-safe worker implementation with Result/Future pattern**

- `declareActivitiesHandler()` - Implement activities with Result/Future pattern
- `declareWorkflow()` - Implement workflows with typed context
- Automatic input/output validation
- Built on @temporal-contract/boxed

```bash
pnpm add @temporal-contract/worker @temporal-contract/boxed
```

### [@temporal-contract/client](/api/client)

**Type-safe client with Result/Future pattern for executing workflows**

- `TypedClient.create()` - Create type-safe workflow client
- Full type inference from contract
- Returns `Future<Result<T, E>>` for explicit error handling
- Type-safe workflow execution

```bash
pnpm add @temporal-contract/client @temporal-contract/boxed
```

### [@temporal-contract/testing](/api/testing)

**Testing utilities for workflows and activities**

- Testcontainers integration for Temporal server
- Vitest extension with `clientConnection` and `workerConnection`
- Global setup for test lifecycle
- Type-safe testing helpers

```bash
pnpm add -D @temporal-contract/testing
```

## Quick Reference

### Contract Definition

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

const contract = defineContract({
  taskQueue: 'my-queue',

  // Global activities
  activities: {
    sendEmail: {
      input: z.object({ to: z.string(), body: z.string() }),
      output: z.object({ sent: z.boolean() })
    }
  },

  // Workflows
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),

      // Workflow-specific activities
      activities: {
        validateOrder: {
          input: z.object({ orderId: z.string() }),
          output: z.object({ valid: z.boolean() })
        }
      }
    }
  }
});
```

### Activity Implementation

```typescript
import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker/activity';
import { Future, Result } from '@temporal-contract/boxed';

const handler = declareActivitiesHandler({
  contract,
  activities: {
    sendEmail: ({ to, body }) =>
      Future.value(Result.Ok({ sent: true })),
    validateOrder: ({ orderId }) =>
      Future.value(Result.Ok({ valid: true }))
  }
});
```

### Workflow Implementation

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract,
  implementation: async (context, { orderId }) => {
    const { valid } = await context.activities.validateOrder({ orderId });
    await context.activities.sendEmail({
      to: 'admin@example.com',
      body: 'Order processed'
    });
    return { success: valid };
  }
});
```

### Worker Setup

```typescript
import { Worker } from '@temporalio/worker';
import { handler } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: handler.activities,
  taskQueue: handler.contract.taskQueue
});

await worker.run();
```

### Client Usage

```typescript
import { TypedClient } from '@temporal-contract/client';
import { Connection } from '@temporalio/client';

const connection = await Connection.connect({
  address: 'localhost:7233'
});

const client = TypedClient.create(contract, { connection });

// Returns Future<Result<T, E>>
const resultFuture = client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123' }
});

// Await the Future and handle result
const result = await resultFuture;
result.match({
  Ok: (output) => console.log('Success:', output),
  Error: (error) => console.error('Failed:', error)
});
```

## Type Utilities

### Contract Types

```typescript
import type { Contract, WorkflowDefinition } from '@temporal-contract/contract';

// Extract contract type
type MyContract = typeof contract;

// Extract workflow definition
type OrderWorkflow = MyContract['workflows']['processOrder'];
```

### Inferred Types

```typescript
import type { InferInput, InferOutput } from '@temporal-contract/contract';

// Infer input type from workflow
type OrderInput = InferInput<typeof contract, 'processOrder'>;

// Infer output type from workflow
type OrderOutput = InferOutput<typeof contract, 'processOrder'>;
```

## Error Handling

### Result Pattern

```typescript
import { TypedClient } from '@temporal-contract/client';
import { Future, Result } from '@temporal-contract/boxed';

// Client returns Future<Result<T, E>>
const resultFuture = client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123' }
});

// Handle with match
await resultFuture.tapOk((output) => {
  console.log('Success:', output);
}).tapError((error) => {
  console.error('Failed:', error);
});

// Or await directly and throw on error
try {
  const output = await resultFuture.resultToPromise();
  console.log('Success:', output);
} catch (error) {
  console.error('Failed:', error);
}
```

## See Also

- [Getting Started Guide](/guide/getting-started)
- [Core Concepts](/guide/core-concepts)
- [Examples](/examples/)
