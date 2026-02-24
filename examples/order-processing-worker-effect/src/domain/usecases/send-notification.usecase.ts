import type { NotificationPort } from "../ports/notification.port.js";

export class SendNotificationUseCase {
  constructor(private readonly notificationPort: NotificationPort) {}

  async execute(customerId: string, subject: string, message: string): Promise<void> {
    if (!customerId.trim()) throw new Error("Customer ID is required");
    if (!subject.trim()) throw new Error("Subject is required");
    if (!message.trim()) throw new Error("Message is required");
    return this.notificationPort.sendNotification(customerId, subject, message);
  }
}
