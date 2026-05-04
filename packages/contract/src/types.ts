import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Base types for validation schemas
 * Any schema that implements the Standard Schema specification
 * This includes Zod, Valibot, ArkType, and other compatible libraries
 */
export type AnySchema = StandardSchemaV1;

/**
 * Definition of an activity
 */
export type ActivityDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> = {
  readonly input: TInput;
  readonly output: TOutput;
};

/**
 * Definition of a signal
 */
export type SignalDefinition<TInput extends AnySchema = AnySchema> = {
  readonly input: TInput;
};

/**
 * Definition of a query
 */
export type QueryDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> = {
  readonly input: TInput;
  readonly output: TOutput;
};

/**
 * Definition of an update
 */
export type UpdateDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> = {
  readonly input: TInput;
  readonly output: TOutput;
};

/**
 * The seven Temporal search attribute kinds.
 *
 * Mirrors `@temporalio/common`'s `SearchAttributeType` so values flow into
 * Temporal's `typedSearchAttributes` API unchanged.
 */
export type SearchAttributeKind =
  | "TEXT"
  | "KEYWORD"
  | "INT"
  | "DOUBLE"
  | "BOOL"
  | "DATETIME"
  | "KEYWORD_LIST";

/**
 * Map each {@link SearchAttributeKind} to its TypeScript representation.
 *
 * - `TEXT` / `KEYWORD` → `string`
 * - `INT` / `DOUBLE` → `number`
 * - `BOOL` → `boolean`
 * - `DATETIME` → `Date`
 * - `KEYWORD_LIST` → `string[]`
 */
export type SearchAttributeKindToType<T extends SearchAttributeKind> = {
  TEXT: string;
  KEYWORD: string;
  INT: number;
  DOUBLE: number;
  BOOL: boolean;
  DATETIME: Date;
  KEYWORD_LIST: string[];
}[T];

/**
 * Definition of a typed search attribute on a workflow.
 */
export type SearchAttributeDefinition<TKind extends SearchAttributeKind = SearchAttributeKind> = {
  readonly kind: TKind;
};

/**
 * Definition of a workflow.
 *
 * Generic parameters preserve the schema literal types of `input`/`output`
 * and the declared shape of activities/signals/queries/updates/search
 * attributes through `defineWorkflow` so client and worker call sites can
 * infer typed payloads. Empty-collection generics default to
 * `Record<string, never>` so that, when no signals/queries/updates/etc. are
 * declared, `keyof` resolves to `never` rather than `string` — turning typos
 * in `signalName`/`queryName`/`updateName` into compile-time errors.
 */
export type WorkflowDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
  TActivities extends Record<string, ActivityDefinition> = Record<string, never>,
  TSignals extends Record<string, SignalDefinition> = Record<string, never>,
  TQueries extends Record<string, QueryDefinition> = Record<string, never>,
  TUpdates extends Record<string, UpdateDefinition> = Record<string, never>,
  TSearchAttributes extends Record<string, SearchAttributeDefinition> = Record<string, never>,
> = {
  readonly input: TInput;
  readonly output: TOutput;
  readonly activities?: TActivities;
  readonly signals?: TSignals;
  readonly queries?: TQueries;
  readonly updates?: TUpdates;
  readonly searchAttributes?: TSearchAttributes;
};

/**
 * Widened constraint variant of {@link WorkflowDefinition}.
 *
 * `WorkflowDefinition` (no args) resolves the empty-record generics to
 * `Record<string, never>`, which is the right default for fresh callers but
 * too narrow as a *constraint* — a Record-of-WorkflowDefinition constraint
 * built from it would reject any literal whose `activities`, `signals`,
 * `queries`, or `updates` block is non-empty. `AnyWorkflowDefinition`
 * widens those generics back to their permissive bounds so it can act as
 * the value of `Record<string, …>` in `ContractDefinition` without
 * preventing real workflow definitions from satisfying the constraint.
 */
export type AnyWorkflowDefinition = WorkflowDefinition<
  AnySchema,
  AnySchema,
  Record<string, ActivityDefinition>,
  Record<string, SignalDefinition>,
  Record<string, QueryDefinition>,
  Record<string, UpdateDefinition>,
  Record<string, SearchAttributeDefinition>
>;

/**
 * Extract signal names declared on a workflow as a string union, or `never`
 * if the workflow declares no signals. Used to constrain `signalName` call
 * sites so typos surface at compile time instead of runtime.
 *
 * The conditional is intentionally distributive over `W` (rather than indexing
 * `W["signals"]` directly) so that union workflow types — e.g. discriminated
 * unions of workflow definitions — yield the *union* of their signal names
 * rather than the intersection (`keyof (A | B)` is the intersection of keys,
 * which usually collapses to `never`). Destructuring `signals` via
 * `infer S` also tolerates the property being absent or `undefined` under
 * `exactOptionalPropertyTypes`.
 */
export type SignalNamesOf<W extends AnyWorkflowDefinition> = W extends {
  signals?: infer S;
}
  ? S extends Record<string, SignalDefinition>
    ? keyof S & string
    : never
  : never;

/**
 * Extract query names declared on a workflow as a string union, or `never`
 * if the workflow declares no queries. See {@link SignalNamesOf} for the
 * rationale behind the distributive `infer`-based shape.
 */
export type QueryNamesOf<W extends AnyWorkflowDefinition> = W extends {
  queries?: infer Q;
}
  ? Q extends Record<string, QueryDefinition>
    ? keyof Q & string
    : never
  : never;

/**
 * Extract update names declared on a workflow as a string union, or `never`
 * if the workflow declares no updates. See {@link SignalNamesOf} for the
 * rationale behind the distributive `infer`-based shape.
 */
export type UpdateNamesOf<W extends AnyWorkflowDefinition> = W extends {
  updates?: infer U;
}
  ? U extends Record<string, UpdateDefinition>
    ? keyof U & string
    : never
  : never;

/**
 * Contract definition containing workflows and optional global activities
 */
export type ContractDefinition<
  TWorkflows extends Record<string, AnyWorkflowDefinition> = Record<string, AnyWorkflowDefinition>,
  TActivities extends Record<string, ActivityDefinition> = Record<string, ActivityDefinition>,
> = {
  readonly taskQueue: string;
  readonly workflows: TWorkflows;
  readonly activities?: TActivities;
};

/**
 * UTILITY TYPES
 */

/**
 * Extract workflow names from a contract as a union type
 *
 * @example
 * ```typescript
 * type MyWorkflowNames = InferWorkflowNames<typeof myContract>;
 * // "processOrder" | "sendNotification"
 * ```
 */
export type InferWorkflowNames<TContract extends ContractDefinition> =
  keyof TContract["workflows"] & string;

/**
 * Extract activity names from a contract (global activities) as a union type
 *
 * @example
 * ```typescript
 * type MyActivityNames = InferActivityNames<typeof myContract>;
 * // "log" | "sendEmail"
 * ```
 */
export type InferActivityNames<TContract extends ContractDefinition> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? keyof TContract["activities"] & string
    : never;

/**
 * Extract all workflows from a contract with their definitions
 *
 * @example
 * ```typescript
 * type MyWorkflows = InferContractWorkflows<typeof myContract>;
 * ```
 */
export type InferContractWorkflows<TContract extends ContractDefinition> = TContract["workflows"];
