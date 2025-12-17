import { Injectable } from "@nestjs/common";
import { ActivitiesHandler } from "@temporal-contract/worker-nestjs/activity";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import type { ActivityImplementations } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { logger } from "../logger.js";

/**
 * Order processing activities handler
 *
 * This handler implements all activities from the order processing contract.
 * It uses NestJS dependency injection for services and follows the multi-handler
 * pattern inspired by ts-rest for ultimate type safety.
 */
@Injectable()
@ActivitiesHandler(orderProcessingContract)
export class OrderActivitiesHandler implements ActivityImplementations<
  typeof orderProcessingContract
> {
  // Global activities
  log(args: { level: string; message: string }) {
    const level = args.level as keyof typeof logger;
    if (typeof logger[level] === "function") {
      (logger[level] as unknown as (msg: string) => void)(args.message);
    }
    return Future.value(Result.Ok(undefined));
  }

  sendNotification(args: { customerId: string; subject: string; message: string }) {
    logger.info({ customerId: args.customerId, subject: args.subject }, "Sending notification");

    return Future.make<Result<void, ActivityError>>((resolve) => {
      // Simulate sending notification
      setTimeout(() => {
        logger.info({ customerId: args.customerId }, "Notification sent successfully");
        resolve(Result.Ok(undefined));
      }, 100);
    });
  }

  // Workflow-specific activities for processOrder workflow
  processPayment(args: { customerId: string; amount: number }) {
    logger.info({ customerId: args.customerId, amount: args.amount }, "Processing payment");

    return Future.make<
      Result<
        { status: "success"; transactionId: string; paidAmount: number } | { status: "failed" },
        ActivityError
      >
    >((resolve) => {
      // Simulate payment processing
      setTimeout(() => {
        const transactionId = `txn-${Date.now()}`;
        logger.info({ transactionId }, "Payment processed successfully");
        resolve(
          Result.Ok({
            status: "success" as const,
            transactionId,
            paidAmount: args.amount,
          }),
        );
      }, 100);
    });
  }

  refundPayment(transactionId: string) {
    logger.info({ transactionId }, "Processing refund");

    return Future.make<Result<void, ActivityError>>((resolve) => {
      // Simulate refund processing
      setTimeout(() => {
        logger.info({ transactionId }, "Refund processed successfully");
        resolve(Result.Ok(undefined));
      }, 100);
    });
  }

  reserveInventory(items: Array<{ productId: string; quantity: number }>) {
    logger.info({ items }, "Reserving inventory");

    return Future.make<Result<{ reservationId: string; reserved: boolean }, ActivityError>>(
      (resolve) => {
        // Simulate inventory reservation
        setTimeout(() => {
          const reservationId = `rsv-${Date.now()}`;
          logger.info({ reservationId }, "Inventory reserved successfully");
          resolve(Result.Ok({ reservationId, reserved: true }));
        }, 100);
      },
    );
  }

  releaseInventory(reservationId: string) {
    logger.info({ reservationId }, "Releasing inventory");

    return Future.make<Result<void, ActivityError>>((resolve) => {
      // Simulate inventory release
      setTimeout(() => {
        logger.info({ reservationId }, "Inventory released successfully");
        resolve(Result.Ok(undefined));
      }, 100);
    });
  }

  createShipment(args: { orderId: string; customerId: string }) {
    logger.info({ orderId: args.orderId, customerId: args.customerId }, "Creating shipment");

    return Future.make<
      Result<{ trackingNumber: string; estimatedDelivery: string }, ActivityError>
    >((resolve) => {
      // Simulate shipment creation
      setTimeout(() => {
        const trackingNumber = `TRK-${Date.now()}`;
        const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        logger.info({ trackingNumber }, "Shipment created successfully");
        resolve(Result.Ok({ trackingNumber, estimatedDelivery }));
      }, 100);
    });
  }
}
