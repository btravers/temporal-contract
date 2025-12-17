import { Injectable } from "@nestjs/common";
import { ImplementActivity } from "@temporal-contract/worker-nestjs/activity";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { logger } from "../logger.js";

/**
 * Payment service implementing payment-related activities
 */
@Injectable()
export class PaymentService {
  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "processPayment" as unknown)
  processPayment(args: { customerId: string; amount: number }) {
    logger.info({ customerId: args.customerId, amount: args.amount }, "Processing payment");

    return Future.make<Result<{ transactionId: string; success: boolean }, ActivityError>>(
      (resolve) => {
        // Simulate payment processing
        setTimeout(() => {
          const transactionId = `txn-${Date.now()}`;
          logger.info({ transactionId }, "Payment processed successfully");
          resolve(Result.Ok({ transactionId, success: true }));
        }, 100);
      },
    );
  }

  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "refundPayment" as unknown)
  refundPayment(transactionId: string) {
    logger.info({ transactionId }, "Processing refund");

    return Future.make<Result<{ refunded: boolean }, ActivityError>>((resolve) => {
      // Simulate refund processing
      setTimeout(() => {
        logger.info({ transactionId }, "Refund processed successfully");
        resolve(Result.Ok({ refunded: true }));
      }, 100);
    });
  }
}
