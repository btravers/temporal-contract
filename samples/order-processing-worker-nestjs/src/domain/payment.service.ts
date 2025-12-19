import { Injectable } from "@nestjs/common";

/**
 * Mock payment service for demonstration
 * In a real application, this would integrate with a payment gateway
 */
@Injectable()
export class PaymentService {
  async charge(customerId: string, amount: number): Promise<string> {
    // Simulate payment processing
    console.log(`Processing payment for customer ${customerId}: $${amount}`);
    await this.delay(100);

    // Generate transaction ID
    return `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async refund(transactionId: string): Promise<void> {
    console.log(`Refunding transaction: ${transactionId}`);
    await this.delay(100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
