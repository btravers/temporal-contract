import { Future, Result } from "@swan-io/boxed";
import type { NotificationPort, NotificationError } from "../../domain/ports/notification.port.js";
import { pino } from "pino";

const logger = pino();

/**
 * Console Notification Adapter
 *
 * Concrete implementation of NotificationPort using Future<Result<T, E>>
 */
export class ConsoleNotificationAdapter implements NotificationPort {
  sendNotification(
    customerId: string,
    subject: string,
    message: string,
  ): Future<Result<void, NotificationError>> {
    return Future.make((resolve) => {
      // Simulate sending notification with 98% success rate
      const success = Math.random() > 0.02;

      if (success) {
        logger.info({ customerId, subject }, `📧 Sending notification to ${customerId}`);
        logger.info({ subject, message }, `   Subject: ${subject}`);
        logger.info({ customerId }, `✅ Notification sent to ${customerId}`);
        resolve(Result.Ok(undefined));
      } else {
        logger.error(`❌ Notification failed`);
        resolve(
          Result.Error({
            code: "NOTIFICATION_FAILED",
            message: "Failed to send customer notification",
            details: { customerId, subject },
          }),
        );
      }
    });
  }
}
