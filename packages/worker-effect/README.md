# @temporal-contract/worker-effect

Effect-native activity handler for `temporal-contract` workers. Activity implementations return `Effect<Output, ActivityError>` instead of `Future<Result<Output, ActivityError>>`, with optional Layer-based service injection.

## Installation

```bash
pnpm add @temporal-contract/worker-effect @temporal-contract/contract-effect effect
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
      output: Schema.Struct({ status: Schema.String }),
      activities: {
        chargePayment: {
          input: Schema.Struct({ amount: Schema.Number }),
          output: Schema.Struct({ transactionId: Schema.String }),
        },
      },
    },
  },
});
```

### 2. Implement activities with Effect

```typescript
// activities.ts
import { Effect } from "effect";
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker-effect";
import { orderContract } from "./contract";

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    processOrder: {
      chargePayment: (args) =>
        Effect.tryPromise({
          try: () => paymentService.charge(args.amount),
          catch: (e) =>
            new ActivityError({
              code: "CHARGE_FAILED",
              message: "Failed to charge payment",
              cause: e,
            }),
        }),
    },
  },
});
```

### 3. Use with a Temporal Worker

```typescript
// worker.ts
import { Worker, NativeConnection } from "@temporalio/worker";
import { activities } from "./activities";
import { orderContract } from "./contract";

const connection = await NativeConnection.connect({ address: "localhost:7233" });
const worker = await Worker.create({
  connection,
  taskQueue: orderContract.taskQueue,
  workflowsPath: new URL("./workflows.js", import.meta.url).pathname,
  activities,
});

await worker.run();
```

## Layer-based Service Injection

For activities that depend on services (database, HTTP client, etc.), use `declareActivitiesHandlerWithLayer`. The Layer is built once at startup; all activity invocations share the same runtime.

```typescript
import { Effect, Layer, Context } from "effect";
import { declareActivitiesHandlerWithLayer, ActivityError } from "@temporal-contract/worker-effect";
import { orderContract } from "./contract";

// Define a service tag
class Database extends Context.Tag("Database")<
  Database,
  {
    query: (sql: string, params: unknown[]) => Effect.Effect<unknown[], ActivityError>;
  }
>() {}

// Provide a live implementation
const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const pool = yield* Effect.tryPromise({
      try: () => createConnectionPool(process.env.DATABASE_URL),
      catch: (e) =>
        new ActivityError({ code: "DB_CONNECT", message: "DB connection failed", cause: e }),
    });
    return {
      query: (sql, params) =>
        Effect.tryPromise({
          try: () => pool.query(sql, params),
          catch: (e) => new ActivityError({ code: "DB_QUERY", message: "Query failed", cause: e }),
        }),
    };
  }),
);

export const activities = await declareActivitiesHandlerWithLayer({
  contract: orderContract,
  layer: DatabaseLive,
  activities: {
    processOrder: {
      chargePayment: (args) =>
        Effect.gen(function* () {
          const db = yield* Database;
          const [row] = yield* db.query(
            "INSERT INTO payments (amount) VALUES (?) RETURNING transaction_id",
            [args.amount],
          );
          return { transactionId: String(row) };
        }),
    },
  },
});
```

## API Reference

### `declareActivitiesHandler(options)`

Synchronous variant for activities with no Effect service dependencies.

```typescript
function declareActivitiesHandler<TContract>(options: {
  contract: TContract;
  activities: ContractEffectActivitiesImplementations<TContract>;
}): EffectActivitiesHandler<TContract>;
```

### `declareActivitiesHandlerWithLayer(options)`

Async variant for activities that need services from Effect context.

```typescript
async function declareActivitiesHandlerWithLayer<TContract, R>(options: {
  contract: TContract;
  layer: Layer.Layer<R>;
  activities: ContractEffectActivitiesImplementationsR<TContract, R>;
}): Promise<EffectActivitiesHandler<TContract>>;
```

### Error types

| Error                             | `_tag`                              | Description                                                             |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `ActivityError`                   | `"ActivityError"`                   | Wrap all technical errors in this. Temporal uses it for retry policies. |
| `ActivityDefinitionNotFoundError` | `"ActivityDefinitionNotFoundError"` | Activity not in contract (thrown at setup time)                         |
| `ActivityInputValidationError`    | `"ActivityInputValidationError"`    | Input schema validation failed                                          |
| `ActivityOutputValidationError`   | `"ActivityOutputValidationError"`   | Output schema validation failed                                         |

All error types are `Data.TaggedError` subclasses. They extend `Error`, so Temporal's retry machinery handles them correctly.

### ActivityError

Wrap all technical exceptions in `ActivityError` so Temporal can:

1. Detect retryable vs non-retryable errors
2. Serialize the error for the workflow to inspect
3. Apply the retry policy defined on the activity options

```typescript
Effect.tryPromise({
  try: () => externalService.call(args),
  catch: (e) => new ActivityError({ code: "CALL_FAILED", message: "...", cause: e }),
});
```

## Important: Workflows cannot use Effect

Temporal workflows run inside a deterministic V8 sandbox. Effect's fiber machinery is not sandbox-safe. **Do not import `effect` inside workflow files.**

For workflow implementations, continue using `@temporal-contract/worker/workflow` with `@temporal-contract/boxed`.

## License

MIT
