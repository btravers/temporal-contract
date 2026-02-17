/**
 * Notification Port - Interface for notification operations
 */
export type NotificationPort = {
  /**
   * Send a notification to a customer
   */
  sendNotification(customerId: string, subject: string, message: string): Promise<void>;
};
