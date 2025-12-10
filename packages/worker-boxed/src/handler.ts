import { Future, Result } from "@swan-io/boxed";
import { ZodError } from "zod";
import {
  type DeclareWorkflowOptions as BaseDeclareWorkflowOptions,
  type QueryHandlerImplementation,
  type SignalHandlerImplementation,
  type UpdateHandlerImplementation,
  type WorkflowContext,
  type WorkflowImplementation,
} from "@temporal-contract/worker/workflow";
import type {
  ActivityDefinition,
  ContractDefinition,
  WorkerInferInput,
  WorkerInferOutput,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import {
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";

/**
 * Activity error class that should be used to wrap all technical exceptions
 * Forces proper error handling and enables retry policies
 */
export class ActivityError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.code = code;
    this.cause = cause;
    this.name = "ActivityError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ActivityError);
    }
  }
}

/**
 * Boxed activity implementation using Result pattern
 * Returns Result<Output, ActivityError> instead of throwing exceptions
 */
export type BoxedActivityImplementation<TActivity extends ActivityDefinition> = (
  args: WorkerInferInput<TActivity>,
) => Future<Result<WorkerInferOutput<TActivity>, ActivityError>>;

/**
 * Boxed activity handler for a global activity from a contract
 *
 * @example
 * ```typescript
 * const log: BoxedActivityHandler<typeof myContract, "log"> = ({ level, message }) => {
 *   return Future.make((resolve) => {
 *     logger[level](message);
 *     resolve(Result.Ok(undefined));
 *   });
 * };
 * ```
 */
export type BoxedActivityHandler<
  TContract extends ContractDefinition,
  TActivityName extends keyof TContract["activities"],
> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? (
        args: WorkerInferInput<TContract["activities"][TActivityName]>,
      ) => Future<Result<WorkerInferOutput<TContract["activities"][TActivityName]>, ActivityError>>
    : never;

/**
 * Boxed activity handler for a workflow-specific activity from a contract
 *
 * @example
 * ```typescript
 * const processPayment: BoxedWorkflowActivityHandler<
 *   typeof myContract,
 *   "processOrder",
 *   "processPayment"
 * > = ({ customerId, amount }) => {
 *   return Future.make((resolve) => {
 *     // Implementation
 *     resolve(Result.Ok({ transactionId, status: "success" as const, paidAmount: amount }));
 *   });
 * };
 * ```
 */
export type BoxedWorkflowActivityHandler<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
  TActivityName extends keyof TContract["workflows"][TWorkflowName]["activities"],
> =
  TContract["workflows"][TWorkflowName]["activities"] extends Record<string, ActivityDefinition>
    ? (
        args: WorkerInferInput<TContract["workflows"][TWorkflowName]["activities"][TActivityName]>,
      ) => Future<
        Result<
          WorkerInferOutput<TContract["workflows"][TWorkflowName]["activities"][TActivityName]>,
          ActivityError
        >
      >
    : never;

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
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Options for creating boxed activities handler
 */
export interface DeclareActivitiesHandlerOptions<T extends ContractDefinition> {
  contract: T;
  activities: BoxedActivityImplementations<T>;
}

/**
 * Boxed activities handler ready for Temporal Worker
 */
export interface ActivitiesHandler<T extends ContractDefinition> {
  contract: T;
  activities: Record<string, (...args: unknown[]) => Promise<unknown>>;
}

/**
 * Options for creating a workflow implementation with boxed pattern
 */
export interface DeclareWorkflowOptions<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> extends Omit<BaseDeclareWorkflowOptions<TContract, TWorkflowName>, "implementation"> {
  implementation: WorkflowImplementation<TContract, TWorkflowName>;
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
 * import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker-boxed';
 * import { Result, Future } from '@swan-io/boxed';
 * import myContract from './contract';
 *
 * export const activitiesHandler = declareActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Activity returns Result instead of throwing
 *     // All technical exceptions must be wrapped in ActivityError for retry policies
 *     sendEmail: (to, subject, body) => {
 *       return Future.make(async resolve => {
 *         try {
 *           await emailService.send({ to, subject, body });
 *           resolve(Result.Ok({ sent: true }));
 *         } catch (error) {
 *           // Wrap technical errors in ActivityError to enable retries
 *           resolve(Result.Error(
 *             new ActivityError(
 *               'EMAIL_SEND_FAILED',
 *               'Failed to send email',
 *               error // Original error as cause for debugging
 *             )
 *           ));
 *         }
 *       });
 *     },
 *     processPayment: ({ amount, customerId }) => {
 *       return Future.make(async resolve => {
 *         try {
 *           const result = await paymentGateway.charge(customerId, amount);
 *           resolve(Result.Ok(result));
 *         } catch (error) {
 *           // Distinguish between retryable and non-retryable errors
 *           if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
 *             // Retryable: wrap in ActivityError
 *             resolve(Result.Error(
 *               new ActivityError('PAYMENT_GATEWAY_UNAVAILABLE', error.message, error)
 *             ));
 *           } else if (error.code === 'INSUFFICIENT_FUNDS') {
 *             // Non-retryable: business error wrapped in ActivityError
 *             resolve(Result.Error(
 *               new ActivityError('INSUFFICIENT_FUNDS', 'Customer has insufficient funds', error)
 *             ));
 *           } else {
 *             // Unknown error: wrap for retry
 *             resolve(Result.Error(
 *               new ActivityError('PAYMENT_ERROR', 'Payment processing failed', error)
 *             ));
 *           }
 *         }
 *       });
 *     },
 *   },
 * });
 * ```
 */
export function declareActivitiesHandler<T extends ContractDefinition>(
  options: DeclareActivitiesHandlerOptions<T>,
): ActivitiesHandler<T> {
  const { contract, activities } = options;

  // Wrap activities with validation and Result unwrapping
  const wrappedActivities: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

  // Collect all available activity definitions
  const allDefinitions: string[] = [];
  if (contract.activities) {
    allDefinitions.push(...Object.keys(contract.activities));
  }
  for (const workflow of Object.values(contract.workflows) as WorkflowDefinition[]) {
    if (workflow.activities) {
      allDefinitions.push(...Object.keys(workflow.activities));
    }
  }

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
      throw new ActivityDefinitionNotFoundError(activityName, allDefinitions);
    }

    wrappedActivities[activityName] = async (...args: unknown[]) => {
      // Extract single parameter (Temporal passes as args array)
      const input = args.length === 1 ? args[0] : args;

      // Validate input
      let validatedInput: unknown;
      try {
        validatedInput = activityDef.input.parse(input);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ActivityInputValidationError(activityName, error);
        }
        throw error;
      }

      // Execute boxed activity (pass single parameter, returns Future<Result<T, E>>)
      const futureResult = (
        activityImpl as (args: unknown) => Future<Result<unknown, ActivityError>>
      )(validatedInput);

      // Unwrap Future and Result
      const result = await futureResult.toPromise();

      return result.match({
        Ok: (value: unknown) => {
          // Validate output on success
          try {
            return activityDef.output.parse(value);
          } catch (error) {
            if (error instanceof ZodError) {
              throw new ActivityOutputValidationError(activityName, error);
            }
            throw error;
          }
        },
        Error: (error: ActivityError) => {
          // Convert Result.Error to thrown ActivityError for Temporal
          throw error;
        },
      });
    };
  }

  return {
    contract,
    activities: wrappedActivities,
  };
}
