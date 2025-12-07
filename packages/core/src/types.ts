import type { z } from 'zod';

/**
 * Base types for validation schemas
 */
export type AnyZodSchema = z.ZodTypeAny;
export type AnyZodTuple = z.ZodTuple<any, any>;

/**
 * Definition of an activity
 */
export interface ActivityDefinition {
  input: AnyZodTuple;
  output: AnyZodSchema;
}

/**
 * Definition of a workflow
 */
export interface WorkflowDefinition {
  input: AnyZodTuple;
  output: AnyZodSchema;
  taskQueue: string;
  activities?: Record<string, ActivityDefinition>;
}

/**
 * Contract definition containing workflows and optional global activities
 */
export interface ContractDefinition {
  workflows: Record<string, WorkflowDefinition>;
  activities?: Record<string, ActivityDefinition>;
}

/**
 * Infer input type from a definition (extract tuple items as array)
 */
export type InferInput<T extends { input: AnyZodTuple }> = z.infer<T['input']> extends readonly [...infer Args]
  ? Args
  : never;

/**
 * Infer output type from a definition
 */
export type InferOutput<T extends { output: AnyZodSchema }> = z.infer<T['output']>;

/**
 * Infer workflow function signature
 */
export type InferWorkflow<T extends WorkflowDefinition> = (
  ...args: InferInput<T>
) => Promise<InferOutput<T>>;

/**
 * Infer activity function signature
 */
export type InferActivity<T extends ActivityDefinition> = (
  ...args: InferInput<T>
) => Promise<InferOutput<T>>;

/**
 * Infer all workflows from a contract
 */
export type InferWorkflows<T extends ContractDefinition> = {
  [K in keyof T['workflows']]: InferWorkflow<T['workflows'][K]>;
};

/**
 * Infer all activities from a contract
 */
export type InferActivities<T extends ContractDefinition> = T['activities'] extends Record<
  string,
  ActivityDefinition
>
  ? {
      [K in keyof T['activities']]: InferActivity<T['activities'][K]>;
    }
  : {};

/**
 * Infer activities from a workflow definition
 */
export type InferWorkflowActivities<T extends WorkflowDefinition> = T['activities'] extends Record<
  string,
  ActivityDefinition
>
  ? {
      [K in keyof T['activities']]: InferActivity<T['activities'][K]>;
    }
  : {};
