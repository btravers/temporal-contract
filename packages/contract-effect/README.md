# @temporal-contract/contract-effect

Effect Schema contract builder for `temporal-contract`. Use this package to define type-safe Temporal contracts using [Effect Schema](https://effect.website/docs/schema/introduction) instead of Zod/Valibot/ArkType.

This is the foundational package for the fully Effect-native stack:

```
@temporal-contract/contract-effect   ← this package
         ↑
@temporal-contract/client-effect     @temporal-contract/worker-effect
```

## Installation

```bash
pnpm add @temporal-contract/contract-effect effect
```

## Quick Start

```typescript
import { Schema } from "effect";
import { defineEffectContract } from "@temporal-contract/contract-effect";

export const orderContract = defineEffectContract({
  taskQueue: "order-processing",
  workflows: {
    processOrder: {
      input: Schema.Struct({
        orderId: Schema.String,
        customerId: Schema.String,
      }),
      output: Schema.Struct({
        orderId: Schema.String,
        status: Schema.Literal("success", "failed"),
      }),
      activities: {
        chargePayment: {
          input: Schema.Struct({
            customerId: Schema.String,
            amount: Schema.Number,
          }),
          output: Schema.Struct({
            transactionId: Schema.String,
          }),
        },
      },
      signals: {
        cancel: {
          input: Schema.Struct({ reason: Schema.String }),
        },
      },
      queries: {
        getStatus: {
          input: Schema.Tuple(),
          output: Schema.Literal("pending", "running", "complete"),
        },
      },
    },
  },
  activities: {
    // Global activities available across all workflows
    log: {
      input: Schema.Struct({ level: Schema.String, message: Schema.String }),
      output: Schema.Void,
    },
  },
});
```

## Key Concepts

### Why Effect Schema?

Effect Schema is deeply integrated with the Effect ecosystem. Unlike Standard Schema adapters, it provides:

- **Bidirectional codecs** — schemas describe both decoding (raw → typed) and encoding (typed → raw) in one definition
- **Tagged errors** — `ParseError` carries structured information about exactly what went wrong
- **Effect-native** — decoding returns `Effect<A, ParseError>` that composes naturally with the rest of your application

### Input vs Output types

Effect Schema distinguishes between two representations:

| Type                       | Description                    | Example                    |
| -------------------------- | ------------------------------ | -------------------------- |
| `Schema.Schema.Type<S>`    | Decoded/parsed TypeScript type | `Date`                     |
| `Schema.Schema.Encoded<S>` | Encoded/serialized form        | `string` (ISO date string) |

The library uses this consistently:

- **Client** sends `Encoded` (raw wire format), receives `Type` (parsed result)
- **Worker** receives `Type` (already parsed), returns `Encoded` (raw form)

### Type utilities

```typescript
import type {
  EffectClientInferInput, // Encoded form (what client sends)
  EffectClientInferOutput, // Type form (what client receives)
  EffectWorkerInferInput, // Type form (what worker receives)
  EffectWorkerInferOutput, // Encoded form (what worker returns)
} from "@temporal-contract/contract-effect";
```

### Schema transformations

Schemas with transformations (e.g. `DateFromString`) carry different input and output types:

```typescript
const DateFromString = Schema.transform(Schema.String, Schema.DateFromSelf, {
  strict: true,
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
});

const def = {
  input: Schema.Struct({ createdAt: DateFromString }),
  // ...
};

// Client sends a string: { createdAt: "2024-01-01T00:00:00.000Z" }
type ClientInput = EffectClientInferInput<typeof def>; // { createdAt: string }

// Worker receives a Date: { createdAt: Date }
type WorkerInput = EffectWorkerInferInput<typeof def>; // { createdAt: Date }
```

## API Reference

### `defineEffectContract(contract)`

Identity function that narrows the contract type for TypeScript inference. The runtime value is returned unchanged.

```typescript
function defineEffectContract<T extends EffectContractDefinition>(contract: T): T;
```

### Types

- `EffectContractDefinition` — the top-level contract type
- `EffectWorkflowDefinition` — a single workflow with input/output schemas
- `EffectActivityDefinition` — an activity with input/output schemas
- `EffectSignalDefinition` — a signal with input schema (no output)
- `EffectQueryDefinition` — a query with input/output schemas
- `EffectUpdateDefinition` — an update with input/output schemas
- `AnyEffectSchema` — `Schema.Schema<unknown, unknown, never>`

## License

MIT
