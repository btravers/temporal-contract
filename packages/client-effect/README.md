# @temporal-contract/client-effect

Effect-native typed Temporal client. All methods return `Effect<T, E>` using `Data.TaggedError` errors, enabling `Effect.catchTag` pattern matching throughout your application.

## Installation

```bash
pnpm add @temporal-contract/client-effect @temporal-contract/contract-effect effect
```

## Quick Start

### 1. Define your contract

```typescript
// contract.ts
import { Schema } from "effect";
import { defineEffectContract } from "@temporal-contract/contract-effect";

export const orderContract = defineEffectContract({
  taskQueue: "order-processing",
  workflows: {
    processOrder: {
      input: Schema.Struct({ orderId: Schema.String }),
      output: Schema.Struct({
        orderId: Schema.String,
        status: Schema.Literal("success", "failed"),
      }),
    },
  },
});
```

### 2. Create the client

```typescript
import { Effect, pipe } from "effect";
import { Connection, Client } from "@temporalio/client";
import { EffectTypedClient } from "@temporal-contract/client-effect";
import { orderContract } from "./contract";

const connection = await Connection.connect();
const client = EffectTypedClient.create(orderContract, new Client({ connection }));
```

### 3. Execute workflows

```typescript
const program = pipe(
  client.executeWorkflow("processOrder", {
    workflowId: "order-123",
    args: { orderId: "ORD-123" },
  }),
  // Typed error handling with Effect.catchTag
  Effect.catchTag("WorkflowValidationError", (e) =>
    Effect.fail(new MyAppError(`Schema validation failed: ${e.direction}`)),
  ),
  Effect.catchTag("WorkflowNotFoundError", (e) =>
    Effect.fail(new MyAppError(`Unknown workflow: ${e.workflowName}`)),
  ),
  Effect.catchTag("RuntimeClientError", (e) =>
    Effect.fail(new MyAppError(`Temporal error in ${e.operation}`)),
  ),
);

const result = await Effect.runPromise(program);
```

## API Reference

### `EffectTypedClient`

#### `EffectTypedClient.create(contract, client)`

Create a typed client from a contract and a Temporal `Client` instance.

#### `client.executeWorkflow(name, options)`

Start a workflow and wait for its result.

Returns `Effect<Output, WorkflowNotFoundError | WorkflowValidationError | RuntimeClientError>`

#### `client.startWorkflow(name, options)`

Start a workflow and return a typed handle immediately.

Returns `Effect<EffectTypedWorkflowHandle<...>, WorkflowNotFoundError | WorkflowValidationError | RuntimeClientError>`

#### `client.getHandle(name, workflowId)`

Get a handle to an existing workflow.

Returns `Effect<EffectTypedWorkflowHandle<...>, WorkflowNotFoundError | RuntimeClientError>`

### `EffectTypedWorkflowHandle`

All methods return `Effect<T, E>`:

| Method                   | Return type                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `result()`               | `Effect<Output, WorkflowValidationError \| RuntimeClientError>`     |
| `queries.myQuery(args)`  | `Effect<QueryOutput, QueryValidationError \| RuntimeClientError>`   |
| `signals.mySignal(args)` | `Effect<void, SignalValidationError \| RuntimeClientError>`         |
| `updates.myUpdate(args)` | `Effect<UpdateOutput, UpdateValidationError \| RuntimeClientError>` |
| `terminate(reason?)`     | `Effect<void, RuntimeClientError>`                                  |
| `cancel()`               | `Effect<void, RuntimeClientError>`                                  |
| `describe()`             | `Effect<WorkflowExecutionDescription, RuntimeClientError>`          |
| `fetchHistory()`         | `Effect<WorkflowExecutionHistory, RuntimeClientError>`              |

### Error types

All errors are `Data.TaggedError` subclasses, so they work with `Effect.catchTag` and `Effect.catchTags`:

| Error                     | `_tag`                      | Key fields                                |
| ------------------------- | --------------------------- | ----------------------------------------- |
| `WorkflowNotFoundError`   | `"WorkflowNotFoundError"`   | `workflowName`, `availableWorkflows`      |
| `WorkflowValidationError` | `"WorkflowValidationError"` | `workflowName`, `direction`, `parseError` |
| `QueryValidationError`    | `"QueryValidationError"`    | `queryName`, `direction`, `parseError`    |
| `SignalValidationError`   | `"SignalValidationError"`   | `signalName`, `parseError`                |
| `UpdateValidationError`   | `"UpdateValidationError"`   | `updateName`, `direction`, `parseError`   |
| `RuntimeClientError`      | `"RuntimeClientError"`      | `operation`, `cause`                      |

## Layer-based DI

For applications fully built with Effect's Layer system:

```typescript
import { Effect, Layer, pipe } from "effect";
import { makeTemporalClientTag, makeTemporalClientLayer } from "@temporal-contract/client-effect";
import { orderContract } from "./contract";

// Create a Context.Tag for this contract's client
const OrderClient = makeTemporalClientTag<typeof orderContract>("OrderClient");

// Create a Layer that establishes the connection and provides the client
const OrderClientLive = makeTemporalClientLayer(OrderClient, orderContract, {
  address: "localhost:7233",
});

// Use the client in your program via Context.Tag
const program = Effect.gen(function* () {
  const client = yield* OrderClient;
  return yield* client.executeWorkflow("processOrder", {
    workflowId: "order-123",
    args: { orderId: "ORD-123" },
  });
});

// Provide the Layer when running
await Effect.runPromise(pipe(program, Effect.provide(OrderClientLive)));
```

## Why Effect over boxed?

Compared to `@temporal-contract/client` which uses `Future<Result<T, E>>`:

| Feature              | `client` (boxed)              | `client-effect` (Effect)                         |
| -------------------- | ----------------------------- | ------------------------------------------------ |
| Error handling       | `result.match({ Ok, Error })` | `Effect.catchTag("ErrorName", ...)`              |
| Error types          | Plain Error subclasses        | `Data.TaggedError` with structured fields        |
| Composition          | `Future.flatMap`              | `Effect.gen` / `Effect.flatMap`                  |
| DI                   | External                      | `Layer` / `Context.Tag`                          |
| Observability        | Manual                        | Effect's built-in tracing with `Effect.withSpan` |
| Error exhaustiveness | Runtime `instanceof`          | Compile-time `_tag` union                        |

## License

MIT
