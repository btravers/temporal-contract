import type { z } from "zod";

/**
 * Base types for validation schemas
 * Constrained to avoid implicit any types
 */
export type AnyZodSchema = z.ZodType<unknown, unknown>;

/**
 * Definition of an activity
 */
export interface ActivityDefinition<
  TInput extends AnyZodSchema = AnyZodSchema,
  TOutput extends AnyZodSchema = AnyZodSchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

/**
 * Definition of a signal
 */
export interface SignalDefinition<TInput extends AnyZodSchema = AnyZodSchema> {
  readonly input: TInput;
}

/**
 * Definition of a query
 */
export interface QueryDefinition<
  TInput extends AnyZodSchema = AnyZodSchema,
  TOutput extends AnyZodSchema = AnyZodSchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

/**
 * Definition of an update
 */
export interface UpdateDefinition<
  TInput extends AnyZodSchema = AnyZodSchema,
  TOutput extends AnyZodSchema = AnyZodSchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

/**
 * Definition of a workflow
 */
export interface WorkflowDefinition<
  TActivities extends Record<string, ActivityDefinition> = Record<string, ActivityDefinition>,
  TSignals extends Record<string, SignalDefinition> = Record<string, SignalDefinition>,
  TQueries extends Record<string, QueryDefinition> = Record<string, QueryDefinition>,
  TUpdates extends Record<string, UpdateDefinition> = Record<string, UpdateDefinition>,
> {
  readonly input: AnyZodSchema;
  readonly output: AnyZodSchema;
  readonly activities?: TActivities;
  readonly signals?: TSignals;
  readonly queries?: TQueries;
  readonly updates?: TUpdates;
}

/**
 * Contract definition containing workflows and optional global activities
 */
export interface ContractDefinition<
  TWorkflows extends Record<string, WorkflowDefinition> = Record<string, WorkflowDefinition>,
  TActivities extends Record<string, ActivityDefinition> = Record<string, ActivityDefinition>,
> {
  readonly taskQueue: string;
  readonly workflows: TWorkflows;
  readonly activities?: TActivities;
}

/**
 * Infer input type from a definition (worker perspective)
 * Worker receives z.output (after input schema parsing/transformation)
 */
export type WorkerInferInput<T extends { input: AnyZodSchema }> = z.output<T["input"]>;

/**
 * Infer output type from a definition (worker perspective)
 * Worker returns z.input (before output schema parsing/transformation)
 */
export type WorkerInferOutput<T extends { output: AnyZodSchema }> = z.input<T["output"]>;

/**
 * Infer input type from a definition (client perspective)
 * Client sends z.input (before input schema parsing/transformation)
 */
export type ClientInferInput<T extends { input: AnyZodSchema }> = z.input<T["input"]>;

/**
 * Infer output type from a definition (client perspective)
 * Client receives z.output (after output schema parsing/transformation)
 */
export type ClientInferOutput<T extends { output: AnyZodSchema }> = z.output<T["output"]>;

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
 * CLIENT PERSPECTIVE
 * Client sends z.output and receives z.input
 */

/**
 * Infer workflow function signature from client perspective
 * Client sends z.output and receives z.input
 */
export type ClientInferWorkflow<TWorkflow extends WorkflowDefinition> = (
  args: ClientInferInput<TWorkflow>,
) => Promise<ClientInferOutput<TWorkflow>>;

/**
 * Infer activity function signature from client perspective
 * Client sends z.output and receives z.input
 */
export type ClientInferActivity<TActivity extends ActivityDefinition> = (
  args: ClientInferInput<TActivity>,
) => Promise<ClientInferOutput<TActivity>>;

/**
 * Infer signal handler signature from client perspective
 * Client sends z.output
 */
export type ClientInferSignal<TSignal extends SignalDefinition> = (
  args: ClientInferInput<TSignal>,
) => Promise<void>;

/**
 * Infer query handler signature from client perspective
 * Client sends z.output and receives z.input
 */
export type ClientInferQuery<TQuery extends QueryDefinition> = (
  args: ClientInferInput<TQuery>,
) => Promise<ClientInferOutput<TQuery>>;

/**
 * Infer update handler signature from client perspective
 * Client sends z.output and receives z.input
 */
export type ClientInferUpdate<TUpdate extends UpdateDefinition> = (
  args: ClientInferInput<TUpdate>,
) => Promise<ClientInferOutput<TUpdate>>;

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
 * CLIENT PERSPECTIVE - Contract-level types
 */

/**
 * Infer all workflows from a contract (client perspective)
 */
export type ClientInferWorkflows<TContract extends ContractDefinition> = {
  [K in keyof TContract["workflows"]]: ClientInferWorkflow<TContract["workflows"][K]>;
};

/**
 * Infer all activities from a contract (client perspective)
 */
export type ClientInferActivities<TContract extends ContractDefinition> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof TContract["activities"]]: ClientInferActivity<TContract["activities"][K]>;
      }
    : {};

/**
 * Infer activities from a workflow definition (client perspective)
 */
export type ClientInferWorkflowActivities<T extends WorkflowDefinition> =
  T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: ClientInferActivity<T["activities"][K]>;
      }
    : {};

/**
 * Infer signals from a workflow definition (client perspective)
 */
export type ClientInferWorkflowSignals<T extends WorkflowDefinition> =
  T["signals"] extends Record<string, SignalDefinition>
    ? {
        [K in keyof T["signals"]]: ClientInferSignal<T["signals"][K]>;
      }
    : {};

/**
 * Infer queries from a workflow definition (client perspective)
 */
export type ClientInferWorkflowQueries<T extends WorkflowDefinition> =
  T["queries"] extends Record<string, QueryDefinition>
    ? {
        [K in keyof T["queries"]]: ClientInferQuery<T["queries"][K]>;
      }
    : {};

/**
 * Infer updates from a workflow definition (client perspective)
 */
export type ClientInferWorkflowUpdates<T extends WorkflowDefinition> =
  T["updates"] extends Record<string, UpdateDefinition>
    ? {
        [K in keyof T["updates"]]: ClientInferUpdate<T["updates"][K]>;
      }
    : {};

/**
 * Infer all activities available in a workflow context (client perspective)
 * Combines workflow-specific activities with global activities
 */
export type ClientInferWorkflowContextActivities<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> = ClientInferWorkflowActivities<TContract["workflows"][TWorkflowName]> &
  ClientInferActivities<TContract>;

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
