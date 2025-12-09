import { Future, Result } from "@swan-io/boxed";
import {
  type CreateWorkflowOptions as BaseCreateWorkflowOptions,
  type QueryHandlerImplementation,
  type SignalHandlerImplementation,
  type UpdateHandlerImplementation,
  type WorkflowContext,
  type WorkflowImplementation,
  createWorkflow as createBaseWorkflow,
} from "@temporal-contract/worker";
import type {
  ActivityDefinition,
  ContractDefinition,
  InferInput,
  InferOutput,
  WorkflowDefinition,
} from "@temporal-contract/core";

/**
 * Activity error type
 */
export interface ActivityError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Boxed activity implementation using Result pattern
 * Returns Result<Output, ActivityError> instead of throwing exceptions
 */
export type BoxedActivityImplementation<TActivity extends ActivityDefinition> = (
  args: InferInput<TActivity>,
) => Future<Result<InferOutput<TActivity>, ActivityError>>;

/**
 * Map of all boxed activity implementations for a contract (global + all workflow-specific)
 */
export type BoxedActivityImplementations<T extends ContractDefinition> =
  // Global activities
  (T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: BoxedActivityImplementation<T["activities"][K]>;
      }
    : {}) &
    // All workflow-specific activities merged
    UnionToIntersection<
      {
        [K in keyof T["workflows"]]: T["workflows"][K]["activities"] extends Record<
          string,
          ActivityDefinition
        >
          ? {
              [A in keyof T["workflows"][K]["activities"]]: BoxedActivityImplementation<
                T["workflows"][K]["activities"][A]
              >;
            }
          : {};
      }[keyof T["workflows"]]
    >;

/**
 * Utility type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

/**
 * Options for creating boxed activities handler
 */
export interface CreateBoxedActivitiesHandlerOptions<T extends ContractDefinition> {
  contract: T;
  activities: BoxedActivityImplementations<T>;
}

/**
 * Boxed activities handler ready for Temporal Worker
 */
export interface BoxedActivitiesHandler<T extends ContractDefinition> {
  contract: T;
  activities: Record<string, (...args: any[]) => Promise<any>>;
}

/**
 * Options for creating a workflow implementation with boxed pattern
 */
export interface CreateWorkflowOptions<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition,
> extends Omit<BaseCreateWorkflowOptions<TWorkflow, TContract>, "implementation"> {
  implementation: WorkflowImplementation<TWorkflow, TContract>;
}

// Re-export types from base worker
export type {
  WorkflowContext,
  WorkflowImplementation,
  SignalHandlerImplementation,
  QueryHandlerImplementation,
  UpdateHandlerImplementation,
};

/**
 * Create a typed boxed activities handler with automatic validation and Result pattern
 *
 * This wraps all activity implementations with:
 * - Zod validation at network boundaries
 * - Result<T, ActivityError> pattern for explicit error handling
 * - Automatic conversion from Result to Promise (throwing on Error)
 *
 * TypeScript ensures ALL activities (global + workflow-specific) are implemented.
 *
 * Use this to create the activities object for the Temporal Worker.
 *
 * @example
 * ```ts
 * import { createBoxedActivitiesHandler } from '@temporal-contract/worker-boxed';
 * import { Result, Future } from '@swan-io/boxed';
 * import myContract from './contract';
 *
 * export const activitiesHandler = createBoxedActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Activity returns Result instead of throwing
 *     sendEmail: (to, subject, body) => {
 *       return Future.make(async resolve => {
 *         try {
 *           await emailService.send({ to, subject, body });
 *           resolve(Result.Ok({ sent: true }));
 *         } catch (error) {
 *           resolve(Result.Error({
 *             code: 'EMAIL_SEND_FAILED',
 *             message: error.message,
 *             details: error
 *           }));
 *         }
 *       });
 *     },
 *   },
 * });
 * ```
 */
export function createBoxedActivitiesHandler<T extends ContractDefinition>(
  options: CreateBoxedActivitiesHandlerOptions<T>,
): BoxedActivitiesHandler<T> {
  const { contract, activities } = options;

  // Wrap activities with validation and Result unwrapping
  const wrappedActivities: Record<string, (...args: any[]) => Promise<any>> = {};

  for (const [activityName, activityImpl] of Object.entries(activities)) {
    // Find activity definition (global or workflow-specific)
    let activityDef: ActivityDefinition | undefined;

    // Check global activities
    if (contract.activities?.[activityName]) {
      activityDef = contract.activities[activityName];
    } else {
      // Check workflow-specific activities
      for (const workflow of Object.values(contract.workflows) as WorkflowDefinition[]) {
        if (workflow.activities?.[activityName]) {
          activityDef = workflow.activities[activityName];
          break;
        }
      }
    }

    if (!activityDef) {
      throw new Error(`Activity definition not found for: ${activityName}`);
    }

    wrappedActivities[activityName] = async (...args: any[]) => {
      // Validate input
      const validatedInput = activityDef.input.parse(args) as any;

      // Execute boxed activity (pass single parameter, returns Future<Result<T, E>>)
      const futureResult = await (activityImpl as any)(validatedInput);

      // Unwrap Future and Result
      const result = await futureResult.toPromise();

      return result.match({
        Ok: (value: any) => {
          // Validate output on success
          return activityDef.output.parse(value);
        },
        Error: (error: ActivityError) => {
          // Convert Result.Error to thrown exception for Temporal
          const err = new Error(error.message);
          (err as any).code = error.code;
          (err as any).details = error.details;
          throw err;
        },
      });
    };
  }

  return {
    contract,
    activities: wrappedActivities,
  };
}

/**
 * Create a typed workflow implementation with automatic validation
 *
 * This is a re-export of the base createWorkflow from @temporal-contract/worker.
 * Workflows in worker-boxed work the same as in worker - only activities use the Result pattern.
 *
 * @example
 * ```ts
 * import { createWorkflow } from '@temporal-contract/worker-boxed';
 * import myContract from '../contract';
 *
 * export const processOrder = createWorkflow({
 *   definition: myContract.workflows.processOrder,
 *   contract: myContract,
 *   implementation: async (context, order) => {
 *     // Activities throw on error (Result is unwrapped in handler)
 *     const payment = await context.activities.processPayment(order);
 *     return { status: 'success' };
 *   },
 *   signals: {
 *     cancel: () => {
 *       // Handle cancellation
 *     },
 *   },
 * });
 * ```
 */
export function createWorkflow<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition,
>(
  options: CreateWorkflowOptions<TWorkflow, TContract>,
): (args: InferInput<TWorkflow>) => Promise<InferOutput<TWorkflow>> {
  // Delegate to base worker implementation - workflows are the same
  return createBaseWorkflow(options as any);
}
