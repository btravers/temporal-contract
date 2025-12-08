import type { z } from 'zod';
import type { ActivityDefinition, WorkflowDefinition, ContractDefinition } from '@temporal-contract/core';

/**
 * Builder for creating activity definitions
 * 
 * @example
 * ```ts
 * const myActivity = activity({
 *   input: z.tuple([z.object({ name: z.string() })]),
 *   output: z.object({ greeting: z.string() }),
 * });
 * ```
 */
export const activity = <TInput extends z.ZodTuple<any, any>, TOutput extends z.ZodTypeAny>(config: {
  input: TInput;
  output: TOutput;
}): ActivityDefinition => {
  return {
    input: config.input,
    output: config.output,
  };
};

/**
 * Builder for creating workflow definitions
 * 
 * @example
 * ```ts
 * const myWorkflow = workflow({
 *   input: z.tuple([z.object({ orderId: z.string() })]),
 *   output: z.object({ status: z.string() }),
 *   activities: {
 *     processPayment: activity({
 *       input: z.tuple([z.object({ amount: z.number() })]),
 *       output: z.object({ success: z.boolean() }),
 *     }),
 *   },
 * });
 * ```
 */
export const workflow = <
  TInput extends z.ZodTuple<any, any>,
  TOutput extends z.ZodTypeAny,
  TActivities extends Record<string, ActivityDefinition> = {}
>(config: {
  input: TInput;
  output: TOutput;
  activities?: TActivities;
}): WorkflowDefinition => {
  const result: WorkflowDefinition = {
    input: config.input,
    output: config.output,
  };
  
  if (config.activities !== undefined) {
    result.activities = config.activities;
  }
  
  return result;
};

/**
 * Builder for creating a complete contract
 * 
 * @example
 * ```ts
 * const myContract = contract({
 *   taskQueue: 'my-service',
 *   workflows: {
 *     processOrder: workflow({ ... }),
 *     sendNotification: workflow({ ... }),
 *   },
 *   activities: {
 *     sendEmail: activity({ ... }),
 *   },
 * });
 * ```
 */
export const contract = <
  TTaskQueue extends string,
  TWorkflows extends Record<string, WorkflowDefinition>,
  TActivities extends Record<string, ActivityDefinition> | undefined = undefined
>(definition: {
  taskQueue: TTaskQueue;
  workflows: TWorkflows;
  activities?: TActivities;
}): ContractDefinition & {
  taskQueue: TTaskQueue;
  workflows: TWorkflows;
  activities: TActivities;
} => {
  return definition as any;
};
