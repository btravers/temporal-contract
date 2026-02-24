import type { NotificationPort } from "../../domain/ports/notification.port.js";
import { logger } from "../../logger.js";

export class ConsoleNotificationAdapter implements NotificationPort {
  async sendNotification(customerId: string, subject: string, _message: string): Promise<void> {
    logger.info({ customerId, subject }, `📧 Notification sent`);
  }
}
