import type { Schema } from "effect";

/**
 * Any Effect Schema with no context requirements.
 *
 * Uses `any` (not `unknown`) for `A` and `I` so that concrete schemas like
 * `Schema.Struct({...})` remain assignable. `Schema.Schema<unknown, unknown, never>`
 * causes contravariance failures on the `annotations` method, preventing concrete
 * schemas from satisfying the bound. `R = never` is preserved to guarantee no
 * service context requirements.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEffectSchema = Schema.Schema<any, any, never>;

/**
 * Activity definition using Effect Schema
 */
export type EffectActivityDefinition = {
  input: AnyEffectSchema;
  output: AnyEffectSchema;
};

/**
 * Signal definition using Effect Schema (fire-and-forget, no output)
 */
export type EffectSignalDefinition = {
  input: AnyEffectSchema;
};

/**
 * Query definition using Effect Schema
 */
export type EffectQueryDefinition = {
  input: AnyEffectSchema;
  output: AnyEffectSchema;
};

/**
 * Update definition using Effect Schema
 */
export type EffectUpdateDefinition = {
  input: AnyEffectSchema;
  output: AnyEffectSchema;
};

/**
 * Workflow definition using Effect Schema
 */
export type EffectWorkflowDefinition = {
  input: AnyEffectSchema;
  output: AnyEffectSchema;
  activities?: Record<string, EffectActivityDefinition>;
  signals?: Record<string, EffectSignalDefinition>;
  queries?: Record<string, EffectQueryDefinition>;
  updates?: Record<string, EffectUpdateDefinition>;
};

/**
 * Full contract definition using Effect Schema
 *
 * Use this instead of `ContractDefinition` from `@temporal-contract/contract`
 * when building a fully Effect-native Temporal stack.
 */
export type EffectContractDefinition = {
  taskQueue: string;
  workflows: Record<string, EffectWorkflowDefinition>;
  activities?: Record<string, EffectActivityDefinition>;
};

/**
 * Define a type-safe Temporal contract using Effect Schema
 *
 * This is the Effect-native analog of `defineContract` from `@temporal-contract/contract`.
 * Use this with `@temporal-contract/client-effect` and `@temporal-contract/worker-effect`.
 *
 * @example
 * ```ts
 * import { Schema } from "effect";
 * import { defineEffectContract } from "@temporal-contract/contract-effect";
 *
 * export const orderContract = defineEffectContract({
 *   taskQueue: "order-processing",
 *   workflows: {
 *     processOrder: {
 *       input:  Schema.Struct({ orderId: Schema.String }),
 *       output: Schema.Struct({ status: Schema.String, orderId: Schema.String }),
 *       activities: {
 *         chargePayment: {
 *           input:  Schema.Struct({ amount: Schema.Number }),
 *           output: Schema.Struct({ transactionId: Schema.String }),
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export function defineEffectContract<T extends EffectContractDefinition>(contract: T): T {
  return contract;
}
