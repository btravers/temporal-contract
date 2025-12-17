import { Injectable } from "@nestjs/common";
import { ImplementActivity } from "@temporal-contract/worker-nestjs/activity";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { logger } from "../logger.js";

/**
 * Notification service implementing notification-related activities
 */
@Injectable()
export class NotificationService {
  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "sendNotification")
  sendNotification(args: { customerId: string; subject: string; message: string }) {
    logger.info({ customerId: args.customerId, subject: args.subject }, "Sending notification");

    return Future.make<Result<{ sent: boolean }, ActivityError>>((resolve) => {
      // Simulate sending notification
      setTimeout(() => {
        logger.info({ customerId: args.customerId }, "Notification sent successfully");
        resolve(Result.Ok({ sent: true }));
      }, 100);
    });
  }

  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "log")
  log(args: { level: string; message: string }) {
    const level = args.level as keyof typeof logger;
    if (typeof logger[level] === "function") {
      (logger[level] as unknown as (msg: string) => void)(args.message);
    }
    return Future.value(Result.Ok(undefined));
  }
}
