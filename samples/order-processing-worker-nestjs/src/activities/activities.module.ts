import { createActivitiesModule } from "@temporal-contract/worker-nestjs/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { OrderActivitiesHandler } from "./order-activities.handler.js";

/**
 * NestJS module for order processing activities
 *
 * Uses the multi-handler approach where OrderActivitiesHandler implements
 * all activities from the contract.
 */
export const ActivitiesModule = createActivitiesModule({
  contract: orderProcessingContract,
  handler: OrderActivitiesHandler,
});
