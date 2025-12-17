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
 * Test contract for integration tests
 * This contract exercises various worker features
 */
export const testContract = defineContract({
  taskQueue: "test-worker-queue",
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

    // Workflow with its own activities
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

    // Workflow with signals, queries, and updates
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

    // Parent workflow that starts child workflows
    parentWorkflow: defineWorkflow({
      input: z.object({
        count: z.number(),
      }),
      output: z.object({
        results: z.array(z.string()),
      }),
    }),

    // Child workflow to be called from parent
    childWorkflow: defineWorkflow({
      input: z.object({
        id: z.number(),
      }),
      output: z.object({
        message: z.string(),
      }),
    }),

    // Workflow that calls a failable activity for error handling tests
    workflowWithFailableActivity: defineWorkflow({
      input: z.object({
        shouldFail: z.boolean(),
      }),
      output: z.object({
        success: z.boolean(),
      }),
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

    // Activity that can fail
    failableActivity: defineActivity({
      input: z.object({
        shouldFail: z.boolean(),
      }),
      output: z.object({
        success: z.boolean(),
      }),
    }),
  },
});
