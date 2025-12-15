import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  AnySchema,
  ActivityDefinition,
  SignalDefinition,
  QueryDefinition,
  UpdateDefinition,
  WorkflowDefinition,
  ContractDefinition,
} from "@temporal-contract/contract";

/**
 * Infer input type from a definition (worker perspective)
 * Worker receives the output type (after input schema parsing/transformation)
 */
export type WorkerInferInput<T extends { input: AnySchema }> = StandardSchemaV1.InferOutput<
  T["input"]
>;

/**
 * Infer output type from a definition (worker perspective)
 * Worker returns the input type (before output schema parsing/transformation)
 */
export type WorkerInferOutput<T extends { output: AnySchema }> = StandardSchemaV1.InferInput<
  T["output"]
>;

/**
 * WORKER PERSPECTIVE
 * Worker receives z.output of input (parsed data) and returns z.input of output (raw data)
 */

/**
 * Infer workflow function signature from worker perspective
 * Worker receives z.input and returns z.output
 */
export type WorkerInferWorkflow<TWorkflow extends WorkflowDefinition> = (
  args: WorkerInferInput<TWorkflow>,
) => Promise<WorkerInferOutput<TWorkflow>>;

/**
 * Infer activity function signature from worker perspective
 * Worker receives z.input and returns z.output
 */
export type WorkerInferActivity<TActivity extends ActivityDefinition> = (
  args: WorkerInferInput<TActivity>,
) => Promise<WorkerInferOutput<TActivity>>;

/**
 * Infer signal handler signature from worker perspective
 * Worker receives z.input
 */
export type WorkerInferSignal<TSignal extends SignalDefinition> = (
  args: WorkerInferInput<TSignal>,
) => Promise<void>;

/**
 * Infer query handler signature from worker perspective
 * Worker receives z.input and returns z.output
 */
export type WorkerInferQuery<TQuery extends QueryDefinition> = (
  args: WorkerInferInput<TQuery>,
) => Promise<WorkerInferOutput<TQuery>>;

/**
 * Infer update handler signature from worker perspective
 * Worker receives z.input and returns z.output
 */
export type WorkerInferUpdate<TUpdate extends UpdateDefinition> = (
  args: WorkerInferInput<TUpdate>,
) => Promise<WorkerInferOutput<TUpdate>>;

/**
 * WORKER PERSPECTIVE - Contract-level types
 */

/**
 * Infer all workflows from a contract (worker perspective)
 */
export type WorkerInferWorkflows<TContract extends ContractDefinition> = {
  [K in keyof TContract["workflows"]]: WorkerInferWorkflow<TContract["workflows"][K]>;
};

/**
 * Infer all activities from a contract (worker perspective)
 */
export type WorkerInferActivities<TContract extends ContractDefinition> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof TContract["activities"]]: WorkerInferActivity<TContract["activities"][K]>;
      }
    : {};

/**
 * Infer activities from a workflow definition (worker perspective)
 */
export type WorkerInferWorkflowActivities<T extends WorkflowDefinition> =
  T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: WorkerInferActivity<T["activities"][K]>;
      }
    : {};

/**
 * Infer signals from a workflow definition (worker perspective)
 */
export type WorkerInferWorkflowSignals<T extends WorkflowDefinition> =
  T["signals"] extends Record<string, SignalDefinition>
    ? {
        [K in keyof T["signals"]]: WorkerInferSignal<T["signals"][K]>;
      }
    : {};

/**
 * Infer queries from a workflow definition (worker perspective)
 */
export type WorkerInferWorkflowQueries<T extends WorkflowDefinition> =
  T["queries"] extends Record<string, QueryDefinition>
    ? {
        [K in keyof T["queries"]]: WorkerInferQuery<T["queries"][K]>;
      }
    : {};

/**
 * Infer updates from a workflow definition (worker perspective)
 */
export type WorkerInferWorkflowUpdates<T extends WorkflowDefinition> =
  T["updates"] extends Record<string, UpdateDefinition>
    ? {
        [K in keyof T["updates"]]: WorkerInferUpdate<T["updates"][K]>;
      }
    : {};

/**
 * Infer all activities available in a workflow context (worker perspective)
 * Combines workflow-specific activities with global activities
 */
export type WorkerInferWorkflowContextActivities<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> = WorkerInferWorkflowActivities<TContract["workflows"][TWorkflowName]> &
  WorkerInferActivities<TContract>;

/**
 * UTILITY TYPES FOR ACTIVITY HANDLERS
 */

/**
 * Infer the handler type for a global activity from a contract
 *
 * @example
 * ```typescript
 * const log: ActivityHandler<typeof myContract, "log"> = async ({ level, message }) => {
 *   logger[level](message);
 * };
 * ```
 */
export type ActivityHandler<
  TContract extends ContractDefinition,
  TActivityName extends keyof TContract["activities"],
> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? (
        args: WorkerInferInput<TContract["activities"][TActivityName]>,
      ) => Promise<WorkerInferOutput<TContract["activities"][TActivityName]>>
    : never;

/**
 * Infer the handler type for a workflow-specific activity from a contract
 *
 * @example
 * ```typescript
 * const processPayment: WorkflowActivityHandler<
 *   typeof myContract,
 *   "processOrder",
 *   "processPayment"
 * > = async ({ customerId, amount }) => {
 *   // Implementation
 *   return { transactionId, status: "success" as const, paidAmount: amount };
 * };
 * ```
 */
export type WorkflowActivityHandler<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
  TActivityName extends keyof TContract["workflows"][TWorkflowName]["activities"],
> =
  TContract["workflows"][TWorkflowName]["activities"] extends Record<string, ActivityDefinition>
    ? (
        args: WorkerInferInput<TContract["workflows"][TWorkflowName]["activities"][TActivityName]>,
      ) => Promise<
        WorkerInferOutput<TContract["workflows"][TWorkflowName]["activities"][TActivityName]>
      >
    : never;
