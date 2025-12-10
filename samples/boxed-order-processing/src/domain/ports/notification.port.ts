import type { Future, Result } from "@swan-io/boxed";

export type NotificationError = {
  code: "NOTIFICATION_FAILED" | "INVALID_RECIPIENT" | "SERVICE_UNAVAILABLE";
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Notification Port - Interface for notification operations
 */
export interface NotificationPort {
  /**
   * Send a notification to a customer
   */
  sendNotification(
    customerId: string,
    subject: string,
    message: string,
  ): Future<Result<void, NotificationError>>;
}
