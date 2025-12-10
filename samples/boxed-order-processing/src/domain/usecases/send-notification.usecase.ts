import { Future, Result } from "@swan-io/boxed";
import type { NotificationPort, NotificationError } from "../ports/notification.port.js";

/**
 * Send Notification Use Case
 *
 * Business logic for sending notifications
 */
export class SendNotificationUseCase {
  constructor(private readonly notificationPort: NotificationPort) {}

  execute(
    customerId: string,
    subject: string,
    message: string,
  ): Future<Result<void, NotificationError>> {
    // Business validation
    if (!customerId || customerId.trim() === "") {
      return Future.value(
        Result.Error({
          code: "INVALID_RECIPIENT" as const,
          message: "Customer ID is required",
          details: { customerId },
        }),
      );
    }

    if (!subject || subject.trim() === "") {
      return Future.value(
        Result.Error({
          code: "NOTIFICATION_FAILED" as const,
          message: "Subject is required",
          details: { subject },
        }),
      );
    }

    if (!message || message.trim() === "") {
      return Future.value(
        Result.Error({
          code: "NOTIFICATION_FAILED" as const,
          message: "Message is required",
          details: { message },
        }),
      );
    }

    // Delegate to notification port
    return this.notificationPort.sendNotification(customerId, subject, message);
  }
}
