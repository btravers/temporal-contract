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

    const result: PaymentResult = {
      transactionId: `TXN${Date.now()}`,
      status: success ? ("success" as const) : ("failed" as const),
      paidAmount: success ? amount : 0,
    };

    if (success) {
      logger.info(
        { transactionId: result.transactionId },
        `✅ Payment processed: ${result.transactionId}`,
      );
    } else {
      logger.error(`❌ Payment failed`);
    }

    return result;
  }
}
