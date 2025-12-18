import {
  defineActivity,
  defineContract,
  defineQuery,
  defineSignal,
  defineUpdate,
  defineWorkflow,
} from "@temporal-contract/contract";
import { z } from "zod";

/**
 * Test contract for worker-nestjs integration tests
 */
export const testNestContract = defineContract({
  taskQueue: "test-nestjs-worker-queue",
  workflows: {
    // Simple workflow for basic testing
    simpleWorkflow: defineWorkflow({
      input: z.object({
        value: z.string(),
      }),
      output: z.object({
        result: z.string(),
      }),
    }),

    // Workflow with its own activities to test NestJS DI
    workflowWithActivities: defineWorkflow({
      input: z.object({
        orderId: z.string(),
        amount: z.number(),
      }),
      output: z.object({
        orderId: z.string(),
        status: z.enum(["success", "failed"]),
        transactionId: z.string().optional(),
        reason: z.string().optional(),
      }),
      activities: {
        processPayment: defineActivity({
          input: z.object({
            amount: z.number(),
          }),
          output: z.object({
            transactionId: z.string(),
            success: z.boolean(),
          }),
        }),
        validateOrder: defineActivity({
          input: z.object({
            orderId: z.string(),
          }),
          output: z.object({
            valid: z.boolean(),
          }),
        }),
      },
    }),

    // Workflow with signals and queries
    interactiveWorkflow: defineWorkflow({
      input: z.object({
        initialValue: z.number(),
      }),
      output: z.object({
        finalValue: z.number(),
      }),
      signals: {
        increment: defineSignal({
          input: z.object({
            amount: z.number(),
          }),
        }),
      },
      queries: {
        getCurrentValue: defineQuery({
          input: z.object({}),
          output: z.object({
            value: z.number(),
          }),
        }),
      },
      updates: {
        multiply: defineUpdate({
          input: z.object({
            factor: z.number(),
          }),
          output: z.object({
            newValue: z.number(),
          }),
        }),
      },
    }),
  },
  activities: {
    // Global activity available to all workflows
    logMessage: defineActivity({
      input: z.object({
        message: z.string(),
      }),
      output: z.object({}),
    }),
  },
});
