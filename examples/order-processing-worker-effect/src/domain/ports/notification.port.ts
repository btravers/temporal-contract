export type NotificationPort = {
  sendNotification(customerId: string, subject: string, message: string): Promise<void>;
};
