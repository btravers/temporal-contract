import { Injectable } from "@nestjs/common";

/**
 * Mock notification service for demonstration
 */
@Injectable()
export class NotificationService {
  async send(customerId: string, subject: string, message: string): Promise<void> {
    console.log(`Sending notification to customer ${customerId}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Message: ${message}`);
    await this.delay(50);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
