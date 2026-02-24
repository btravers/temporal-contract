import type { Schema } from "effect";
import type {
  AnyEffectSchema,
  EffectActivityDefinition,
  EffectContractDefinition,
  EffectQueryDefinition,
  EffectSignalDefinition,
  EffectUpdateDefinition,
  EffectWorkflowDefinition,
} from "./contract.js";

/**
 * Infer the client-facing input type from a definition
 *
 * Client perspective: sends the encoded (raw/unvalidated) form of the input schema.
 * This is the "before parsing" representation — e.g. strings for dates before
 * transformation, raw union discriminants, etc.
 */
export type EffectClientInferInput<T extends { input: AnyEffectSchema }> = Schema.Schema.Encoded<
  T["input"]
>;

/**
 * Infer the client-facing output type from a definition
 *
 * Client perspective: receives the decoded (parsed/validated) form of the output schema.
 */
export type EffectClientInferOutput<T extends { output: AnyEffectSchema }> = Schema.Schema.Type<
  T["output"]
>;

/**
 * Infer the worker-facing input type from a definition
 *
 * Worker perspective: receives the decoded (parsed/validated) form of the input schema.
 */
export type EffectWorkerInferInput<T extends { input: AnyEffectSchema }> = Schema.Schema.Type<
  T["input"]
>;

/**
 * Infer the worker-facing output type from a definition
 *
 * Worker perspective: returns the encoded (raw) form of the output schema —
 * the worker produces the raw value which is then validated before being
 * sent back to the client.
 */
export type EffectWorkerInferOutput<T extends { output: AnyEffectSchema }> = Schema.Schema.Encoded<
  T["output"]
>;

// ---------------------------------------------------------------------------
// Workflow-level inference helpers
// ---------------------------------------------------------------------------

/**
 * Infer workflow function signature from client perspective
 */
export type EffectClientInferWorkflow<TWorkflow extends EffectWorkflowDefinition> = (
  args: EffectClientInferInput<TWorkflow>,
) => Promise<EffectClientInferOutput<TWorkflow>>;

/**
 * Infer activity function signature from client perspective
 */
export type EffectClientInferActivity<TActivity extends EffectActivityDefinition> = (
  args: EffectClientInferInput<TActivity>,
) => Promise<EffectClientInferOutput<TActivity>>;

/**
 * Infer signal handler signature from client perspective
 */
export type EffectClientInferSignal<TSignal extends EffectSignalDefinition> = (
  args: EffectClientInferInput<TSignal>,
) => Promise<void>;

/**
 * Infer query handler signature from client perspective
 */
export type EffectClientInferQuery<TQuery extends EffectQueryDefinition> = (
  args: EffectClientInferInput<TQuery>,
) => Promise<EffectClientInferOutput<TQuery>>;

/**
 * Infer update handler signature from client perspective
 */
export type EffectClientInferUpdate<TUpdate extends EffectUpdateDefinition> = (
  args: EffectClientInferInput<TUpdate>,
) => Promise<EffectClientInferOutput<TUpdate>>;

// ---------------------------------------------------------------------------
// Contract-level inference helpers
// ---------------------------------------------------------------------------

/**
 * Infer all workflows from a contract (client perspective)
 */
export type EffectClientInferWorkflows<TContract extends EffectContractDefinition> = {
  [K in keyof TContract["workflows"]]: EffectClientInferWorkflow<TContract["workflows"][K]>;
};

/**
 * Infer workflow-specific signals from a workflow definition (client perspective)
 */
export type EffectClientInferWorkflowSignals<T extends EffectWorkflowDefinition> =
  T["signals"] extends Record<string, EffectSignalDefinition>
    ? {
        [K in keyof T["signals"]]: EffectClientInferSignal<T["signals"][K]>;
      }
    : Record<string, never>;

/**
 * Infer workflow-specific queries from a workflow definition (client perspective)
 */
export type EffectClientInferWorkflowQueries<T extends EffectWorkflowDefinition> =
  T["queries"] extends Record<string, EffectQueryDefinition>
    ? {
        [K in keyof T["queries"]]: EffectClientInferQuery<T["queries"][K]>;
      }
    : Record<string, never>;

/**
 * Infer workflow-specific updates from a workflow definition (client perspective)
 */
export type EffectClientInferWorkflowUpdates<T extends EffectWorkflowDefinition> =
  T["updates"] extends Record<string, EffectUpdateDefinition>
    ? {
        [K in keyof T["updates"]]: EffectClientInferUpdate<T["updates"][K]>;
      }
    : Record<string, never>;
