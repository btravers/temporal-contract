import { z } from "zod";
import type {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "./types.js";

/**
 * Schema for validating JavaScript identifiers (workflow names, activity names, etc.)
 * Allows: letters, digits, underscore, dollar sign
 * Must start with: letter, underscore, or dollar sign
 */
const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/, "must be a valid JavaScript identifier");

/**
 * Extract clean error message from Zod validation error
 */
const getCleanErrorMessage = (error: z.ZodError): string => {
  try {
    const parsed = JSON.parse(error.message);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const firstError = parsed[0];

      // For record key validation errors, dive into nested issues
      if (
        firstError?.code === "invalid_key" &&
        firstError?.issues &&
        firstError.issues.length > 0
      ) {
        const nestedError = firstError.issues[0];
        if (nestedError?.message) {
          return nestedError.message;
        }
      }

      // For direct validation errors
      if (firstError?.message) {
        return firstError.message;
      }
    }
  } catch {
    // If parsing fails, return the raw message
  }
  return error.message;
};

/**
 * Schema for validating activity definitions
 * Checks that input and output are Zod schemas
 */
const activityDefinitionSchema = z.object({
  input: z.instanceof(z.ZodType, {
    message: "input must be a Zod schema",
  }),
  output: z.instanceof(z.ZodType, {
    message: "output must be a Zod schema",
  }),
});

/**
 * Schema for validating signal definitions
 */
const signalDefinitionSchema = z.object({
  input: z.instanceof(z.ZodType, {
    message: "input must be a Zod schema",
  }),
});

/**
 * Schema for validating query definitions
 */
const queryDefinitionSchema = z.object({
  input: z.instanceof(z.ZodType, {
    message: "input must be a Zod schema",
  }),
  output: z.instanceof(z.ZodType, {
    message: "output must be a Zod schema",
  }),
});

/**
 * Schema for validating update definitions
 */
const updateDefinitionSchema = z.object({
  input: z.instanceof(z.ZodType, {
    message: "input must be a Zod schema",
  }),
  output: z.instanceof(z.ZodType, {
    message: "output must be a Zod schema",
  }),
});

/**
 * Schema for validating workflow definitions
 */
const workflowDefinitionSchema = z.object({
  input: z.instanceof(z.ZodType, {
    message: "input must be a Zod schema",
  }),
  output: z.instanceof(z.ZodType, {
    message: "output must be a Zod schema",
  }),
  activities: z.record(identifierSchema, activityDefinitionSchema).optional(),
  signals: z.record(identifierSchema, signalDefinitionSchema).optional(),
  queries: z.record(identifierSchema, queryDefinitionSchema).optional(),
  updates: z.record(identifierSchema, updateDefinitionSchema).optional(),
});

/**
 * Schema for validating a contract definition structure
 */
const contractValidationSchema = z
  .object({
    taskQueue: z.string().trim().min(1, "taskQueue cannot be empty"),
    workflows: z
      .record(identifierSchema, workflowDefinitionSchema)
      .refine((workflows) => Object.keys(workflows).length > 0, {
        message: "at least one workflow is required",
      }),
    activities: z.record(identifierSchema, activityDefinitionSchema).optional(),
  })
  .superRefine((contract, ctx) => {
    // Check for conflicts between global and workflow-specific activities
    if (!contract.activities) {
      return;
    }

    for (const [workflowName, workflow] of Object.entries(contract.workflows)) {
      if (workflow.activities) {
        for (const activityName of Object.keys(workflow.activities)) {
          if (activityName in contract.activities) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `workflow "${workflowName}" has activity "${activityName}" that conflicts with a global activity. Consider renaming the workflow-specific activity or removing the global activity "${activityName}".`,
            });
            return;
          }
        }
      }
    }
  });

/**
 * Builder for creating activity definitions
 *
 * @example
 * ```ts
 * const myActivity = defineActivity({
 *   input: z.tuple([z.object({ name: z.string() })]),
 *   output: z.object({ greeting: z.string() }),
 * });
 * ```
 */
export const defineActivity = <TActivity extends ActivityDefinition>(
  definition: TActivity,
): TActivity => {
  return definition;
};

/**
 * Builder for creating signal definitions
 *
 * @example
 * ```ts
 * const mySignal = defineSignal({
 *   input: z.object({ message: z.string() }),
 * });
 * ```
 */
export const defineSignal = <TSignal extends SignalDefinition>(definition: TSignal): TSignal => {
  return definition;
};

/**
 * Builder for creating query definitions
 *
 * @example
 * ```ts
 * const myQuery = defineQuery({
 *   input: z.object({ id: z.string() }),
 *   output: z.object({ status: z.string() }),
 * });
 * ```
 */
export const defineQuery = <TQuery extends QueryDefinition>(definition: TQuery): TQuery => {
  return definition;
};

/**
 * Builder for creating update definitions
 *
 * @example
 * ```ts
 * const myUpdate = defineUpdate({
 *   input: z.object({ value: z.number() }),
 *   output: z.object({ newValue: z.number() }),
 * });
 * ```
 */
export const defineUpdate = <TUpdate extends UpdateDefinition>(definition: TUpdate): TUpdate => {
  return definition;
};

/**
 * Builder for creating workflow definitions
 *
 * @example
 * ```ts
 * const myWorkflow = defineWorkflow({
 *   input: z.tuple([z.object({ orderId: z.string() })]),
 *   output: z.object({ status: z.string() }),
 *   activities: {
 *     processPayment: defineActivity({
 *       input: z.tuple([z.object({ amount: z.number() })]),
 *       output: z.object({ success: z.boolean() }),
 *     }),
 *   },
 * });
 * ```
 */
export const defineWorkflow = <TWorkflow extends WorkflowDefinition>(
  definition: TWorkflow,
): TWorkflow => {
  return definition;
};

/**
 * Builder for creating a complete contract
 *
 * @example
 * ```ts
 * const myContract = defineContract({
 *   taskQueue: 'my-service',
 *   workflows: {
 *     processOrder: defineWorkflow({ ... }),
 *     sendNotification: defineWorkflow({ ... }),
 *   },
 *   activities: {
 *     sendEmail: defineActivity({ ... }),
 *   },
 * });
 * ```
 */
export const defineContract = <TContract extends ContractDefinition>(
  definition: TContract,
): TContract => {
  // Validate entire contract structure with Zod (including activity conflicts)
  const validationResult = contractValidationSchema.safeParse(definition);

  if (!validationResult.success) {
    const cleanMessage = getCleanErrorMessage(validationResult.error);
    throw new Error(`Contract error: ${cleanMessage}`);
  }

  return definition;
};
