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

**Type-safe worker implementation with automatic validation**

- `declareActivitiesHandler()` - Implement activities with validation
- `declareWorkflow()` - Implement workflows with typed context
- Automatic input/output validation

```bash
pnpm add @temporal-contract/worker
```

### [@temporal-contract/worker-boxed](/api/worker-boxed)

**Worker with Result/Future pattern for explicit error handling**

- Same API as `@temporal-contract/worker`
- Returns `Result<T, E>` instead of throwing exceptions
- Uses `Future<T, E>` for async operations
- Built on [@swan-io/boxed](https://swan-io.github.io/boxed/)

```bash
pnpm add @temporal-contract/worker-boxed @swan-io/boxed
```

### [@temporal-contract/client](/api/client)

**Type-safe client for executing workflows**

- `TypedClient.create()` - Create type-safe workflow client
- Full type inference from contract
- Type-safe workflow execution

```bash
pnpm add @temporal-contract/client
```

### [@temporal-contract/testing](/api/testing)

**Testing utilities for workflows and activities**

- Mock activity implementations
- Workflow testing helpers
- Integration test utilities

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
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';

const handler = declareActivitiesHandler({
  contract,
  activities: {
    sendEmail: async ({ to, body }) => ({ sent: true }),
    validateOrder: async ({ orderId }) => ({ valid: true })
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

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123' }
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

### Standard (Exceptions)

```typescript
try {
  const result = await client.executeWorkflow('processOrder', {
    workflowId: 'order-123',
    args: { orderId: 'ORD-123' }
  });
} catch (error) {
  console.error('Workflow failed:', error);
}
```

### Result Pattern (Boxed)

```typescript
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';
import { Result } from '@swan-io/boxed';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract,
  implementation: async (context, { orderId }) => {
    const result = await context.activities.validateOrder({ orderId });

    return result.match({
      Ok: ({ valid }) => Result.Ok({ success: valid }),
      Error: (error) => Result.Error(error)
    });
  }
});
```

## See Also

- [Getting Started Guide](/guide/getting-started)
- [Core Concepts](/guide/core-concepts)
- [Examples](/examples/)
