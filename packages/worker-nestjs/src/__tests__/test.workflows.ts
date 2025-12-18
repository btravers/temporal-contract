import { testNestContract } from "./test.contract.js";
import { declareWorkflow } from "@temporal-contract/worker/workflow";
import { sleep } from "@temporalio/workflow";

export const simpleWorkflow = declareWorkflow({
  workflowName: "simpleWorkflow",
  contract: testNestContract,
  implementation: async ({ activities }, args) => {
    await activities.logMessage({ message: `Processing: ${args.value}` });
    return {
      result: `Processed: ${args.value}`,
    };
  },
});

export const workflowWithActivities = declareWorkflow({
  workflowName: "workflowWithActivities",
  contract: testNestContract,
  implementation: async ({ activities }, args) => {
    // Validate order
    const validationResult = await activities.validateOrder({ orderId: args.orderId });

    if (!validationResult.valid) {
      return {
        orderId: args.orderId,
        status: "failed" as const,
        reason: "Invalid order ID",
      };
    }

    // Process payment
    const paymentResult = await activities.processPayment({ amount: args.amount });

    if (!paymentResult.success) {
      return {
        orderId: args.orderId,
        status: "failed" as const,
        reason: "Payment failed",
      };
    }

    // Log success
    await activities.logMessage({
      message: `Order ${args.orderId} completed with transaction ${paymentResult.transactionId}`,
    });

    return {
      orderId: args.orderId,
      status: "success" as const,
      transactionId: paymentResult.transactionId,
    };
  },
});

export const interactiveWorkflow = declareWorkflow({
  workflowName: "interactiveWorkflow",
  contract: testNestContract,
  implementation: async ({ defineSignal, defineQuery, defineUpdate }, args) => {
    let currentValue = 0;

    currentValue = args.initialValue;

    // Define signal, query, and update handlers with access to workflow state
    defineSignal("increment", async (signalArgs) => {
      currentValue += signalArgs.amount;
    });

    defineQuery("getCurrentValue", () => {
      return { value: currentValue };
    });

    defineUpdate("multiply", async (updateArgs) => {
      currentValue *= updateArgs.factor;
      return { newValue: currentValue };
    });

    // Simulate some processing time to allow signals/queries/updates
    await sleep(100);

    return {
      finalValue: currentValue,
    };
  },
});
