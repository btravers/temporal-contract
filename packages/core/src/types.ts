import type { z } from "zod";

/**
 * Base types for validation schemas
 */
export type AnyZodSchema = z.ZodTypeAny;

/**
 * Definition of an activity
 */
export interface ActivityDefinition {
  input: AnyZodSchema;
  output: AnyZodSchema;
}

/**
 * Definition of a signal
 */
export interface SignalDefinition {
  input: AnyZodSchema;
}

/**
 * Definition of a query
 */
export interface QueryDefinition {
  input: AnyZodSchema;
  output: AnyZodSchema;
}

/**
 * Definition of an update
 */
export interface UpdateDefinition {
  input: AnyZodSchema;
  output: AnyZodSchema;
}

/**
 * Definition of a workflow
 */
export interface WorkflowDefinition {
  input: AnyZodSchema;
  output: AnyZodSchema;
  activities?: Record<string, ActivityDefinition>;
  signals?: Record<string, SignalDefinition>;
  queries?: Record<string, QueryDefinition>;
  updates?: Record<string, UpdateDefinition>;
}

/**
 * Contract definition containing workflows and optional global activities
 */
export interface ContractDefinition {
  taskQueue: string;
  workflows: Record<string, WorkflowDefinition>;
  activities?: Record<string, ActivityDefinition>;
}

/**
 * Infer input type from a definition
 */
export type InferInput<T extends { input: AnyZodSchema }> = z.infer<T["input"]>;

/**
 * Infer output type from a definition
 */
export type InferOutput<T extends { output: AnyZodSchema }> = z.infer<T["output"]>;

/**
 * Infer workflow function signature
 * Workflow functions receive a single argument and return a Promise
 */
export type InferWorkflow<T extends WorkflowDefinition> = (
  args: InferInput<T>,
) => Promise<InferOutput<T>>;

/**
 * Infer activity function signature
 * Activity functions receive a single argument and return a Promise
 */
export type InferActivity<T extends ActivityDefinition> = (
  args: InferInput<T>,
) => Promise<InferOutput<T>>;

/**
 * Infer signal handler signature
 * Signal handlers receive args and return void
 */
export type InferSignal<T extends SignalDefinition> = (args: InferInput<T>) => void;

/**
 * Infer query handler signature
 * Query handlers receive args and return output synchronously
 */
export type InferQuery<T extends QueryDefinition> = (
  args: InferInput<T>,
) => Promise<InferOutput<T>>;

/**
 * Infer update handler signature
 * Update handlers receive args and return output as a Promise
 */
export type InferUpdate<T extends UpdateDefinition> = (
  args: InferInput<T>,
) => Promise<InferOutput<T>>;

/**
 * Infer all workflows from a contract
 */
export type InferWorkflows<T extends ContractDefinition> = {
  [K in keyof T["workflows"]]: InferWorkflow<T["workflows"][K]>;
};

/**
 * Infer all activities from a contract
 */
export type InferActivities<T extends ContractDefinition> =
  T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: InferActivity<T["activities"][K]>;
      }
    : {};

/**
 * Infer activities from a workflow definition
 */
export type InferWorkflowActivities<T extends WorkflowDefinition> =
  T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: InferActivity<T["activities"][K]>;
      }
    : {};

/**
 * Infer signals from a workflow definition
 */
export type InferWorkflowSignals<T extends WorkflowDefinition> =
  T["signals"] extends Record<string, SignalDefinition>
    ? {
        [K in keyof T["signals"]]: InferSignal<T["signals"][K]>;
      }
    : {};

/**
 * Infer queries from a workflow definition
 */
export type InferWorkflowQueries<T extends WorkflowDefinition> =
  T["queries"] extends Record<string, QueryDefinition>
    ? {
        [K in keyof T["queries"]]: InferQuery<T["queries"][K]>;
      }
    : {};

/**
 * Infer updates from a workflow definition
 */
export type InferWorkflowUpdates<T extends WorkflowDefinition> =
  T["updates"] extends Record<string, UpdateDefinition>
    ? {
        [K in keyof T["updates"]]: InferUpdate<T["updates"][K]>;
      }
    : {};

/**
 * Infer all activities available in a workflow context (workflow activities + global activities)
 */
export type InferWorkflowContextActivities<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition,
> = InferWorkflowActivities<TWorkflow> & InferActivities<TContract>;
