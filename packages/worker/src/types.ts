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
 * Infer input type from a definition (client perspective)
 * Client sends the input type (before input schema parsing/transformation)
 */
export type ClientInferInput<T extends { input: AnySchema }> = StandardSchemaV1.InferInput<
  T["input"]
>;

/**
 * Infer output type from a definition (client perspective)
 * Client receives the output type (after output schema parsing/transformation)
 */
export type ClientInferOutput<T extends { output: AnySchema }> = StandardSchemaV1.InferOutput<
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
type WorkerInferWorkflow<TWorkflow extends WorkflowDefinition> = (
  args: WorkerInferInput<TWorkflow>,
) => Promise<WorkerInferOutput<TWorkflow>>;

/**
 * Infer signal handler signature from worker perspective
 * Worker receives z.input
 */
type WorkerInferSignal<TSignal extends SignalDefinition> = (
  args: WorkerInferInput<TSignal>,
) => Promise<void>;

/**
 * Infer query handler signature from worker perspective
 * Worker receives z.input and returns z.output
 */
type WorkerInferQuery<TQuery extends QueryDefinition> = (
  args: WorkerInferInput<TQuery>,
) => Promise<WorkerInferOutput<TQuery>>;

/**
 * Infer update handler signature from worker perspective
 * Worker receives z.input and returns z.output
 */
type WorkerInferUpdate<TUpdate extends UpdateDefinition> = (
  args: WorkerInferInput<TUpdate>,
) => Promise<WorkerInferOutput<TUpdate>>;

/**
 * WORKER PERSPECTIVE - Contract-level types
 */

/**
 * Infer all workflows from a contract (worker perspective)
 */
type WorkerInferWorkflows<TContract extends ContractDefinition> = {
  [K in keyof TContract["workflows"]]: WorkerInferWorkflow<TContract["workflows"][K]>;
};

/**
 * Infer signals from a workflow definition (worker perspective)
 */
type WorkerInferWorkflowSignals<T extends WorkflowDefinition> =
  T["signals"] extends Record<string, SignalDefinition>
    ? {
        [K in keyof T["signals"]]: WorkerInferSignal<T["signals"][K]>;
      }
    : {};

/**
 * Infer queries from a workflow definition (worker perspective)
 */
type WorkerInferWorkflowQueries<T extends WorkflowDefinition> =
  T["queries"] extends Record<string, QueryDefinition>
    ? {
        [K in keyof T["queries"]]: WorkerInferQuery<T["queries"][K]>;
      }
    : {};

/**
 * Infer updates from a workflow definition (worker perspective)
 */
type WorkerInferWorkflowUpdates<T extends WorkflowDefinition> =
  T["updates"] extends Record<string, UpdateDefinition>
    ? {
        [K in keyof T["updates"]]: WorkerInferUpdate<T["updates"][K]>;
      }
    : {};

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
type ActivityHandler<
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
type WorkflowActivityHandler<
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
