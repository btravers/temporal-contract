import type { PaymentPort } from "../../domain/ports/payment.port.js";
import type { PaymentResult } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

export class MockPaymentAdapter implements PaymentPort {
  async processPayment(customerId: string, amount: number): Promise<PaymentResult> {
    logger.info({ customerId, amount }, `💳 Processing payment of $${amount}`);

    const success = Math.random() > 0.1;

    if (success) {
      const result: PaymentResult = {
        status: "success" as const,
        transactionId: `TXN${Date.now()}`,
        paidAmount: amount,
      };
      logger.info({ transactionId: result.transactionId }, `✅ Payment processed`);
      return result;
    }

    logger.error(`❌ Payment failed`);
    return { status: "failed" as const };
  }

  async refundPayment(transactionId: string): Promise<void> {
    logger.info({ transactionId }, `💰 Processing refund`);
    logger.info(`✅ Refund successful`);
  }
}
