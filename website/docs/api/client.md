# @temporal-contract/client

Type-safe client for executing workflows with Result/Future pattern.

## Installation

```bash
pnpm add @temporal-contract/client @swan-io/boxed
```

## Features

- Type-safe workflow execution
- Result/Future pattern for explicit error handling
- Automatic validation of inputs and outputs
- Re-exports boxed utilities for convenience

## Entry Point

```typescript
import { TypedClient } from '@temporal-contract/client';
import type {
  ClientInferInput,
  ClientInferOutput,
  ClientInferWorkflow,
  ClientInferActivity,
  ClientInferSignal,
  ClientInferQuery,
  ClientInferUpdate
} from '@temporal-contract/client';
```

## Type Utilities

### Input/Output Inference

Extract input and output types from definitions (client perspective):

```typescript
import type { ClientInferInput, ClientInferOutput } from '@temporal-contract/client';

const workflowDef = {
  input: z.object({ orderId: z.string() }),
  output: z.object({ success: z.boolean() })
};

// Client sends raw input (z.input)
type Input = ClientInferInput<typeof workflowDef>;  // { orderId: string }

// Client receives parsed output (z.output)
type Output = ClientInferOutput<typeof workflowDef>;  // { success: boolean }
```

### Handler Types

Extract client-side function signatures:

```typescript
import type { ClientInferWorkflow } from '@temporal-contract/client';

const workflowDef = {
  input: z.object({ orderId: z.string() }),
  output: z.object({ success: z.boolean() })
};

// Workflow invocation signature
type WorkflowFn = ClientInferWorkflow<typeof workflowDef>;
// (args: { orderId: string }) => Promise<{ success: boolean }>
```

### Signal, Query, and Update Types

Client-side types for workflow interactions:

```typescript
import type {
  ClientInferSignal,
  ClientInferQuery,
  ClientInferUpdate
} from '@temporal-contract/client';
import { Future, Result } from '@swan-io/boxed';

// Signal returns Future<Result<void, Error>>
type SignalFn = ClientInferSignal<typeof signalDef>;

// Query returns Future<Result<T, Error>>
type QueryFn = ClientInferQuery<typeof queryDef>;

// Update returns Future<Result<T, Error>>
type UpdateFn = ClientInferUpdate<typeof updateDef>;
```

### Contract-Level Types

Extract types for entire contracts:

```typescript
import type {
  ClientInferWorkflows,
  ClientInferActivities
} from '@temporal-contract/client';

// All workflows from contract
type Workflows = ClientInferWorkflows<typeof myContract>;

// All activities from contract
type Activities = ClientInferActivities<typeof myContract>;
```

## API Reference

See [Getting Started](/guide/getting-started) and [Result Pattern Guide](/guide/result-pattern).
