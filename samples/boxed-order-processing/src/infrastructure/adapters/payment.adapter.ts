import { Future, Result } from "@swan-io/boxed";
import type { PaymentPort, PaymentError } from "../../domain/ports/payment.port.js";
import type { PaymentResult } from "../../domain/entities/order.schema.js";
import { pino } from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

/**
 * Mock Payment Adapter
 *
 * Concrete implementation of PaymentPort using Future<Result<T, E>>
 */
export class MockPaymentAdapter implements PaymentPort {
  processPayment(customerId: string, amount: number): Future<Result<PaymentResult, PaymentError>> {
    return Future.make((resolve) => {
      logger.info(
        { customerId, amount },
        `💳 Processing payment of $${amount} for customer ${customerId}`,
      );

      // Simulate payment processing with 90% success rate
      const success = Math.random() > 0.1;

      if (success) {
        const result: PaymentResult = {
          transactionId: `TXN${Date.now()}`,
          status: "success" as const,
          paidAmount: amount,
        };

        logger.info(
          { transactionId: result.transactionId },
          `✅ Payment processed: ${result.transactionId}`,
        );
        resolve(Result.Ok(result));
      } else {
        logger.error(`❌ Payment failed`);
        resolve(
          Result.Error({
            code: "PAYMENT_FAILED",
            message: "Payment declined by payment processor",
            details: { customerId, amount },
          }),
        );
      }
    });
  }

  refundPayment(transactionId: string): Future<Result<void, PaymentError>> {
    return Future.make((resolve) => {
      logger.info({ transactionId }, `💰 Processing refund for transaction ${transactionId}`);

      // Simulate refund processing with 99% success rate
      const success = Math.random() > 0.01;

      if (success) {
        logger.info(`✅ Refund successful`);
        resolve(Result.Ok(undefined));
      } else {
        logger.error(`❌ Refund failed`);
        resolve(
          Result.Error({
            code: "REFUND_FAILED",
            message: "Payment processor rejected refund request",
            details: { transactionId },
          }),
        );
      }
    });
  }
}
