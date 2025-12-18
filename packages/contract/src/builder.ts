import { z } from "zod";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "./types.js";

// Exported builders first (classic functions for hoisting)
export function defineActivity<TActivity extends ActivityDefinition>(
  definition: TActivity,
): TActivity {
  return definition;
}

export function defineSignal<TSignal extends SignalDefinition>(definition: TSignal): TSignal {
  return definition;
}

export function defineQuery<TQuery extends QueryDefinition>(definition: TQuery): TQuery {
  return definition;
}

export function defineUpdate<TUpdate extends UpdateDefinition>(definition: TUpdate): TUpdate {
  return definition;
}

export function defineWorkflow<TWorkflow extends WorkflowDefinition>(
  definition: TWorkflow,
): TWorkflow {
  return definition;
}

export function defineContract<TContract extends ContractDefinition>(
  definition: TContract,
): TContract {
  // Validate entire contract structure with Zod (including activity conflicts)
  const validationResult = contractValidationSchema.safeParse(definition);

  if (!validationResult.success) {
    const cleanMessage = getCleanErrorMessage(validationResult.error);
    throw new Error(`Contract error: ${cleanMessage}`);
  }

  return definition;
}

/**
 * Check if a value is a Standard Schema compatible schema
 */
function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  // Standard Schema can be either an object or a function (e.g., ArkType)
  if (
    (typeof value !== "object" && typeof value !== "function") ||
    value === null ||
    !("~standard" in value)
  ) {
    return false;
  }

  const standard = (value as Record<string, unknown>)["~standard"];

  return (
    typeof standard === "object" &&
    standard !== null &&
    (standard as Record<string, unknown>)["version"] === 1 &&
    typeof (standard as Record<string, unknown>)["validate"] === "function"
  );
}

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
function getCleanErrorMessage(error: z.ZodError): string {
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
}

/**
 * Schema for validating activity definitions
 * Checks that input and output are Standard Schema compatible schemas
 */
const activityDefinitionSchema = z.object({
  input: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "input must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
  output: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "output must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
});

/**
 * Schema for validating signal definitions
 */
const signalDefinitionSchema = z.object({
  input: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "input must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
});

/**
 * Schema for validating query definitions
 */
const queryDefinitionSchema = z.object({
  input: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "input must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
  output: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "output must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
});

/**
 * Schema for validating update definitions
 */
const updateDefinitionSchema = z.object({
  input: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "input must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
  output: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "output must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
});

/**
 * Schema for validating workflow definitions
 */
const workflowDefinitionSchema = z.object({
  input: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "input must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
  }),
  output: z.custom<StandardSchemaV1>((val) => isStandardSchema(val), {
    message: "output must be a Standard Schema compatible schema (e.g., Zod, Valibot, ArkType)",
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
