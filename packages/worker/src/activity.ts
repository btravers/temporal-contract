// Entry point for activities
import {
  ActivityDefinition,
  ContractDefinition,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import { Future, Result } from "@temporal-contract/boxed";
import { WorkerInferInput, WorkerInferOutput } from "./types.js";
import {
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";

export {
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";

/**
 * Activity error class that should be used to wrap all technical exceptions
 * Forces proper error handling and enables retry policies
 */
export class ActivityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.cause = cause;
    this.name = "ActivityError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ActivityError);
    }
  }
}

/**
 * Activity implementation using Future/Result pattern
 *
 * Returns Future<Result<Output, ActivityError>> for explicit error handling instead of throwing exceptions.
 * All errors must be wrapped in ActivityError to enable proper retry policies.
 */
type BoxedActivityImplementation<TActivity extends ActivityDefinition> = (
  args: WorkerInferInput<TActivity>,
) => Future<Result<WorkerInferOutput<TActivity>, ActivityError>>;

/**
 * Map of all activity implementations for a contract (global + all workflow-specific)
 */
type ActivityImplementations<T extends ContractDefinition> =
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
 * Options for creating activities handler
 */
interface DeclareActivitiesHandlerOptions<T extends ContractDefinition> {
  contract: T;
  activities: ActivityImplementations<T>;
}

/**
 * Activities handler ready for Temporal Worker
 */
interface ActivitiesHandler<T extends ContractDefinition> {
  contract: T;
  activities: Record<string, (...args: unknown[]) => Promise<unknown>>;
}

/**
 * Create a typed activities handler with automatic validation and Result pattern
 *
 * This wraps all activity implementations with:
 * - Validation at network boundaries
 * - Result<T, ActivityError> pattern for explicit error handling
 * - Automatic conversion from Result to Promise (throwing on Error)
 *
 * TypeScript ensures ALL activities (global + workflow-specific) are implemented.
 *
 * Use this to create the activities object for the Temporal Worker.
 *
 * @example
 * ```ts
 * import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker/activity';
 * import { Result, Future } from '@temporal-contract/boxed';
 * import myContract from './contract';
 *
 * export const activitiesHandler = declareActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Activity returns Result instead of throwing
 *     // All technical exceptions must be wrapped in ActivityError for retry policies
 *     sendEmail: (args) => {
 *       return Future.make(async resolve => {
 *         try {
 *           await emailService.send(args);
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
 *   },
 * });
 *
 * // Use with Temporal Worker
 * import { Worker } from '@temporalio/worker';
 *
 * const worker = await Worker.create({
 *   workflowsPath: require.resolve('./workflows'),
 *   activities: activitiesHandler.activities,
 *   taskQueue: activitiesHandler.contract.taskQueue,
 * });
 * ```
 */
export function declareActivitiesHandler<T extends ContractDefinition>(
  options: DeclareActivitiesHandlerOptions<T>,
): ActivitiesHandler<T> {
  const { contract, activities } = options;

  // Prepare Temporal-compatible activities with validation and Result unwrapping
  const wrappedActivities: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

  // Collect all available activity definitions from contract
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
    // Locate activity definition (global or workflow-specific)
    let activityDef: ActivityDefinition | undefined;

    // First, check global activities
    if (contract.activities?.[activityName]) {
      activityDef = contract.activities[activityName];
    } else {
      // Then, check workflow-specific activities
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
      // Extract single parameter (Temporal passes arguments as an array)
      const input = args.length === 1 ? args[0] : args;

      // Validate input
      const inputResult = await activityDef.input["~standard"].validate(input);
      if (inputResult.issues) {
        throw new ActivityInputValidationError(activityName, inputResult.issues);
      }

      // Execute boxed activity (returns Future<Result<T, ActivityError>>)
      const futureResult = (
        activityImpl as (args: unknown) => Future<Result<unknown, ActivityError>>
      )(inputResult.value);

      // Await Future and unwrap Result
      const result = await futureResult;

      // Process result: validate output or throw error
      if (result.isOk()) {
        // Validate output on success
        const outputResult = await activityDef.output["~standard"].validate(result.value);
        if (outputResult.issues) {
          throw new ActivityOutputValidationError(activityName, outputResult.issues);
        }
        return outputResult.value;
      } else {
        // Convert Result.Error to thrown ActivityError for Temporal
        throw result.error;
      }
    };
  }

  return {
    contract,
    activities: wrappedActivities,
  };
}
