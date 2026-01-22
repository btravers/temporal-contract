**@temporal-contract/contract**

---

# @temporal-contract/contract

## Interfaces

### ActivityDefinition&lt;TInput, TOutput&gt;

Defined in: [types.ts:13](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L13)

Definition of an activity

#### Type Parameters

| Type Parameter                                | Default type              |
| --------------------------------------------- | ------------------------- |
| `TInput` _extends_ [`AnySchema`](#anyschema)  | [`AnySchema`](#anyschema) |
| `TOutput` _extends_ [`AnySchema`](#anyschema) | [`AnySchema`](#anyschema) |

#### Properties

| Property                     | Modifier   | Type      | Defined in                                                                                                                                    |
| ---------------------------- | ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="input"></a> `input`   | `readonly` | `TInput`  | [types.ts:17](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L17) |
| <a id="output"></a> `output` | `readonly` | `TOutput` | [types.ts:18](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L18) |

---

### ContractDefinition&lt;TWorkflows, TActivities&gt;

Defined in: [types.ts:70](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L70)

Contract definition containing workflows and optional global activities

#### Type Parameters

| Type Parameter                                                                                | Default type                                                          |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `TWorkflows` _extends_ `Record`&lt;`string`, [`WorkflowDefinition`](#workflowdefinition)&gt;  | `Record`&lt;`string`, [`WorkflowDefinition`](#workflowdefinition)&gt; |
| `TActivities` _extends_ `Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&gt; | `Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&gt; |

#### Properties

| Property                              | Modifier   | Type          | Defined in                                                                                                                                    |
| ------------------------------------- | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="activities"></a> `activities?` | `readonly` | `TActivities` | [types.ts:76](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L76) |
| <a id="taskqueue"></a> `taskQueue`    | `readonly` | `string`      | [types.ts:74](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L74) |
| <a id="workflows"></a> `workflows`    | `readonly` | `TWorkflows`  | [types.ts:75](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L75) |

---

### QueryDefinition&lt;TInput, TOutput&gt;

Defined in: [types.ts:31](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L31)

Definition of a query

#### Type Parameters

| Type Parameter                                | Default type              |
| --------------------------------------------- | ------------------------- |
| `TInput` _extends_ [`AnySchema`](#anyschema)  | [`AnySchema`](#anyschema) |
| `TOutput` _extends_ [`AnySchema`](#anyschema) | [`AnySchema`](#anyschema) |

#### Properties

| Property                       | Modifier   | Type      | Defined in                                                                                                                                    |
| ------------------------------ | ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="input-1"></a> `input`   | `readonly` | `TInput`  | [types.ts:35](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L35) |
| <a id="output-1"></a> `output` | `readonly` | `TOutput` | [types.ts:36](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L36) |

---

### SignalDefinition&lt;TInput&gt;

Defined in: [types.ts:24](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L24)

Definition of a signal

#### Type Parameters

| Type Parameter                               | Default type              |
| -------------------------------------------- | ------------------------- |
| `TInput` _extends_ [`AnySchema`](#anyschema) | [`AnySchema`](#anyschema) |

#### Properties

| Property                     | Modifier   | Type     | Defined in                                                                                                                                    |
| ---------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="input-2"></a> `input` | `readonly` | `TInput` | [types.ts:25](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L25) |

---

### UpdateDefinition&lt;TInput, TOutput&gt;

Defined in: [types.ts:42](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L42)

Definition of an update

#### Type Parameters

| Type Parameter                                | Default type              |
| --------------------------------------------- | ------------------------- |
| `TInput` _extends_ [`AnySchema`](#anyschema)  | [`AnySchema`](#anyschema) |
| `TOutput` _extends_ [`AnySchema`](#anyschema) | [`AnySchema`](#anyschema) |

#### Properties

| Property                       | Modifier   | Type      | Defined in                                                                                                                                    |
| ------------------------------ | ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="input-3"></a> `input`   | `readonly` | `TInput`  | [types.ts:46](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L46) |
| <a id="output-2"></a> `output` | `readonly` | `TOutput` | [types.ts:47](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L47) |

---

### WorkflowDefinition&lt;TActivities, TSignals, TQueries, TUpdates&gt;

Defined in: [types.ts:53](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L53)

Definition of a workflow

#### Type Parameters

| Type Parameter                                                                                | Default type                                                          |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `TActivities` _extends_ `Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&gt; | `Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&gt; |
| `TSignals` _extends_ `Record`&lt;`string`, [`SignalDefinition`](#signaldefinition)&gt;        | `Record`&lt;`string`, [`SignalDefinition`](#signaldefinition)&gt;     |
| `TQueries` _extends_ `Record`&lt;`string`, [`QueryDefinition`](#querydefinition)&gt;          | `Record`&lt;`string`, [`QueryDefinition`](#querydefinition)&gt;       |
| `TUpdates` _extends_ `Record`&lt;`string`, [`UpdateDefinition`](#updatedefinition)&gt;        | `Record`&lt;`string`, [`UpdateDefinition`](#updatedefinition)&gt;     |

#### Properties

| Property                                | Modifier   | Type                      | Defined in                                                                                                                                    |
| --------------------------------------- | ---------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="activities-1"></a> `activities?` | `readonly` | `TActivities`             | [types.ts:61](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L61) |
| <a id="input-4"></a> `input`            | `readonly` | [`AnySchema`](#anyschema) | [types.ts:59](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L59) |
| <a id="output-3"></a> `output`          | `readonly` | [`AnySchema`](#anyschema) | [types.ts:60](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L60) |
| <a id="queries"></a> `queries?`         | `readonly` | `TQueries`                | [types.ts:63](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L63) |
| <a id="signals"></a> `signals?`         | `readonly` | `TSignals`                | [types.ts:62](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L62) |
| <a id="updates"></a> `updates?`         | `readonly` | `TUpdates`                | [types.ts:64](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L64) |

## Type Aliases

### AnySchema

```ts
type AnySchema = StandardSchemaV1;
```

Defined in: [types.ts:8](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L8)

Base types for validation schemas
Any schema that implements the Standard Schema specification
This includes Zod, Valibot, ArkType, and other compatible libraries

---

### InferActivityNames&lt;TContract&gt;

```ts
type InferActivityNames<TContract> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? keyof TContract["activities"] & string
    : never;
```

Defined in: [types.ts:104](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L104)

Extract activity names from a contract (global activities) as a union type

#### Type Parameters

| Type Parameter                                                    |
| ----------------------------------------------------------------- |
| `TContract` _extends_ [`ContractDefinition`](#contractdefinition) |

#### Example

```typescript
type MyActivityNames = InferActivityNames<typeof myContract>;
// "log" | "sendEmail"
```

---

### InferContractWorkflows&lt;TContract&gt;

```ts
type InferContractWorkflows<TContract> = TContract["workflows"];
```

Defined in: [types.ts:117](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L117)

Extract all workflows from a contract with their definitions

#### Type Parameters

| Type Parameter                                                    |
| ----------------------------------------------------------------- |
| `TContract` _extends_ [`ContractDefinition`](#contractdefinition) |

#### Example

```typescript
type MyWorkflows = InferContractWorkflows<typeof myContract>;
```

---

### InferWorkflowNames&lt;TContract&gt;

```ts
type InferWorkflowNames<TContract> = keyof TContract["workflows"] & string;
```

Defined in: [types.ts:92](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/types.ts#L92)

Extract workflow names from a contract as a union type

#### Type Parameters

| Type Parameter                                                    |
| ----------------------------------------------------------------- |
| `TContract` _extends_ [`ContractDefinition`](#contractdefinition) |

#### Example

```typescript
type MyWorkflowNames = InferWorkflowNames<typeof myContract>;
// "processOrder" | "sendNotification"
```

## Functions

### defineActivity()

```ts
function defineActivity<TActivity>(definition): TActivity;
```

Defined in: [builder.ts:43](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/builder.ts#L43)

Define a Temporal activity with type-safe input and output schemas.

Activities are the building blocks of Temporal workflows that execute business logic
and interact with external services. This function preserves TypeScript types while
providing a consistent structure for activity definitions.

#### Type Parameters

| Type Parameter                                                                                                                | Description                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `TActivity` _extends_ [`ActivityDefinition`](#activitydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt; | The activity definition type with input/output schemas |

#### Parameters

| Parameter    | Type        | Description                                                 |
| ------------ | ----------- | ----------------------------------------------------------- |
| `definition` | `TActivity` | The activity definition containing input and output schemas |

#### Returns

`TActivity`

The same definition with preserved types for type inference

#### Example

```typescript
import { defineActivity } from "@temporal-contract/contract";
import { z } from "zod";

export const sendEmail = defineActivity({
  input: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  output: z.object({
    messageId: z.string(),
    sentAt: z.date(),
  }),
});
```

---

### defineContract()

```ts
function defineContract<TContract>(definition): TContract;
```

Defined in: [builder.ts:226](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/builder.ts#L226)

Define a complete Temporal contract with type-safe workflows and activities.

A contract is the central definition that ties together your Temporal application's
workflows and activities. It provides:

- Type safety across client, worker, and workflow code
- Automatic validation at runtime
- Compile-time verification of implementations
- Clear API boundaries and documentation

The contract validates the structure and ensures:

- Task queue is specified
- At least one workflow is defined
- Valid JavaScript identifiers are used
- No conflicts between global and workflow-specific activities
- All schemas implement the Standard Schema specification

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Description                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `TContract` _extends_ [`ContractDefinition`](#contractdefinition)&lt;`Record`&lt;`string`, [`WorkflowDefinition`](#workflowdefinition)&lt;`Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;, `Record`&lt;`string`, [`SignalDefinition`](#signaldefinition)&lt;[`AnySchema`](#anyschema)&gt;&gt;, `Record`&lt;`string`, [`QueryDefinition`](#querydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;, `Record`&lt;`string`, [`UpdateDefinition`](#updatedefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;&gt;&gt;, `Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;&gt; | The contract definition type |

#### Parameters

| Parameter    | Type        | Description                      |
| ------------ | ----------- | -------------------------------- |
| `definition` | `TContract` | The complete contract definition |

#### Returns

`TContract`

The same definition with preserved types for type inference

#### Throws

If the contract structure is invalid

#### Example

```typescript
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

export const myContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),
      activities: {
        chargePayment: {
          input: z.object({ amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        },
      },
    },
  },
  // Optional global activities shared across workflows
  activities: {
    logEvent: {
      input: z.object({ message: z.string() }),
      output: z.void(),
    },
  },
});
```

---

### defineQuery()

```ts
function defineQuery<TQuery>(definition): TQuery;
```

Defined in: [builder.ts:100](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/builder.ts#L100)

Define a Temporal query with type-safe input and output schemas.

Queries allow you to read the current state of a running workflow without
modifying it. They are synchronous and should not perform any mutations.

#### Type Parameters

| Type Parameter                                                                                                       | Description                                         |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `TQuery` _extends_ [`QueryDefinition`](#querydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt; | The query definition type with input/output schemas |

#### Parameters

| Parameter    | Type     | Description                                              |
| ------------ | -------- | -------------------------------------------------------- |
| `definition` | `TQuery` | The query definition containing input and output schemas |

#### Returns

`TQuery`

The same definition with preserved types for type inference

#### Example

```typescript
import { defineQuery } from "@temporal-contract/contract";
import { z } from "zod";

export const getOrderStatus = defineQuery({
  input: z.object({ orderId: z.string() }),
  output: z.object({
    status: z.enum(["pending", "processing", "completed", "failed"]),
    updatedAt: z.date(),
  }),
});
```

---

### defineSignal()

```ts
function defineSignal<TSignal>(definition): TSignal;
```

Defined in: [builder.ts:72](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/builder.ts#L72)

Define a Temporal signal with type-safe input schema.

Signals are asynchronous messages sent to running workflows to update their state
or trigger certain behaviors. This function ensures type safety for signal payloads.

#### Type Parameters

| Type Parameter                                                                               | Description                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `TSignal` _extends_ [`SignalDefinition`](#signaldefinition)&lt;[`AnySchema`](#anyschema)&gt; | The signal definition type with input schema |

#### Parameters

| Parameter    | Type      | Description                                   |
| ------------ | --------- | --------------------------------------------- |
| `definition` | `TSignal` | The signal definition containing input schema |

#### Returns

`TSignal`

The same definition with preserved types for type inference

#### Example

```typescript
import { defineSignal } from "@temporal-contract/contract";
import { z } from "zod";

export const approveOrder = defineSignal({
  input: z.object({
    orderId: z.string(),
    approvedBy: z.string(),
  }),
});
```

---

### defineUpdate()

```ts
function defineUpdate<TUpdate>(definition): TUpdate;
```

Defined in: [builder.ts:132](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/builder.ts#L132)

Define a Temporal update with type-safe input and output schemas.

Updates are similar to signals but return a value and wait for the workflow
to process them before completing. They provide a synchronous way to modify
workflow state and get immediate feedback.

#### Type Parameters

| Type Parameter                                                                                                          | Description                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `TUpdate` _extends_ [`UpdateDefinition`](#updatedefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt; | The update definition type with input/output schemas |

#### Parameters

| Parameter    | Type      | Description                                               |
| ------------ | --------- | --------------------------------------------------------- |
| `definition` | `TUpdate` | The update definition containing input and output schemas |

#### Returns

`TUpdate`

The same definition with preserved types for type inference

#### Example

```typescript
import { defineUpdate } from "@temporal-contract/contract";
import { z } from "zod";

export const updateOrderQuantity = defineUpdate({
  input: z.object({
    orderId: z.string(),
    newQuantity: z.number().positive(),
  }),
  output: z.object({
    success: z.boolean(),
    totalPrice: z.number(),
  }),
});
```

---

### defineWorkflow()

```ts
function defineWorkflow<TWorkflow>(definition): TWorkflow;
```

Defined in: [builder.ts:169](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/contract/src/builder.ts#L169)

Define a Temporal workflow with type-safe input, output, and associated operations.

Workflows are durable functions that orchestrate activities, handle timeouts,
and manage long-running processes. This function provides type safety for the
entire workflow definition including activities, signals, queries, and updates.

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Description                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `TWorkflow` _extends_ [`WorkflowDefinition`](#workflowdefinition)&lt;`Record`&lt;`string`, [`ActivityDefinition`](#activitydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;, `Record`&lt;`string`, [`SignalDefinition`](#signaldefinition)&lt;[`AnySchema`](#anyschema)&gt;&gt;, `Record`&lt;`string`, [`QueryDefinition`](#querydefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;, `Record`&lt;`string`, [`UpdateDefinition`](#updatedefinition)&lt;[`AnySchema`](#anyschema), [`AnySchema`](#anyschema)&gt;&gt;&gt; | The workflow definition type with all associated schemas |

#### Parameters

| Parameter    | Type        | Description                                                      |
| ------------ | ----------- | ---------------------------------------------------------------- |
| `definition` | `TWorkflow` | The workflow definition containing input, output, and operations |

#### Returns

`TWorkflow`

The same definition with preserved types for type inference

#### Example

```typescript
import { defineWorkflow, defineActivity, defineSignal } from "@temporal-contract/contract";
import { z } from "zod";

export const processOrder = defineWorkflow({
  input: z.object({ orderId: z.string() }),
  output: z.object({ success: z.boolean() }),
  activities: {
    validatePayment: defineActivity({
      input: z.object({ orderId: z.string() }),
      output: z.object({ valid: z.boolean() }),
    }),
  },
  signals: {
    cancel: defineSignal({
      input: z.object({ reason: z.string() }),
    }),
  },
});
```
