import type { NotificationPort } from "../../domain/ports/notification.port.js";
import { logger } from "../../logger.js";

/**
 * Console Notification Adapter
 *
 * Concrete implementation of NotificationPort using console logging
 */
export class ConsoleNotificationAdapter implements NotificationPort {
  async sendNotification(customerId: string, subject: string, message: string): Promise<void> {
    // Simulate sending notification via console
    // In real implementation, this would call an email/SMS service
    logger.info({ customerId, subject }, `📧 Sending notification to ${customerId}`);
    logger.info({ subject, message }, `   Subject: ${subject}`);
    logger.info({ customerId }, `✅ Notification sent to ${customerId}`);
  }
}
