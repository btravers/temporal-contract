import type { PaymentPort } from "../../domain/ports/payment.port.js";
import type { PaymentResult } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

/**
 * Mock Payment Adapter
 *
 * Concrete implementation of PaymentPort for testing/demo purposes
 */
export class MockPaymentAdapter implements PaymentPort {
  async processPayment(customerId: string, amount: number): Promise<PaymentResult> {
    logger.info(
      { customerId, amount },
      `💳 Processing payment of $${amount} for customer ${customerId}`,
    );

    // Simulate payment processing
    // In real implementation, this would call a payment gateway API
    const success = Math.random() > 0.1; // 10% failure rate

    if (success) {
      const result: PaymentResult = {
        status: "success" as const,
        transactionId: `TXN${Date.now()}`,
        paidAmount: amount,
      };

      logger.info(
        { transactionId: result.transactionId },
        `✅ Payment processed: ${result.transactionId}`,
      );

      return result;
    } else {
      const result: PaymentResult = {
        status: "failed" as const,
      };

      logger.error(`❌ Payment failed`);

      return result;
    }
  }
}
