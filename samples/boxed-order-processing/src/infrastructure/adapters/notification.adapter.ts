import { Future, Result } from "@swan-io/boxed";
import type { NotificationPort, NotificationError } from "../../domain/ports/notification.port.js";
import { logger } from "../../logger.js";

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
    return Future.fromPromise(
      Promise.resolve().then(() => {
        // Simulate sending notification with 98% success rate
        const success = Math.random() > 0.02;

        if (!success) {
          logger.error(`❌ Notification failed`);
          throw {
            code: "NOTIFICATION_FAILED",
            message: "Failed to send customer notification",
            details: { customerId, subject },
          };
        }

        logger.info({ customerId, subject }, `📧 Sending notification to ${customerId}`);
        logger.info({ subject, message }, `   Subject: ${subject}`);
        logger.info({ customerId }, `✅ Notification sent to ${customerId}`);
      })
    ).mapError(error => {
      // Convert thrown errors to NotificationError
      if (error && typeof error === 'object' && 'code' in error) {
        return error as NotificationError;
      }
      return {
        code: "NOTIFICATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown notification error",
        details: { customerId, subject },
      };
    });
  }
}
