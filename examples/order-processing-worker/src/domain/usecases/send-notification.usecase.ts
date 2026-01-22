import type { NotificationPort } from "../ports/notification.port.js";

/**
 * Send Notification Use Case
 *
 * Business logic for sending notifications
 */
export class SendNotificationUseCase {
  constructor(private readonly notificationPort: NotificationPort) {}

  async execute(customerId: string, subject: string, message: string): Promise<void> {
    // Business validation
    if (!customerId || customerId.trim() === "") {
      throw new Error("Customer ID is required");
    }

    if (!subject || subject.trim() === "") {
      throw new Error("Subject is required");
    }

    if (!message || message.trim() === "") {
      throw new Error("Message is required");
    }

    // Delegate to notification port
    return this.notificationPort.sendNotification(customerId, subject, message);
  }
}
