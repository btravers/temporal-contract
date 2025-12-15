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
export interface ActivityDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

/**
 * Definition of a signal
 */
export interface SignalDefinition<TInput extends AnySchema = AnySchema> {
  readonly input: TInput;
}

/**
 * Definition of a query
 */
export interface QueryDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

/**
 * Definition of an update
 */
export interface UpdateDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
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
  readonly input: AnySchema;
  readonly output: AnySchema;
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
