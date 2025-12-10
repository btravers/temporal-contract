import { Future, Result } from "@swan-io/boxed";
import type { PaymentPort, PaymentError } from "../../domain/ports/payment.port.js";
import type { PaymentResult } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

/**
 * Mock Payment Adapter
 *
 * Concrete implementation of PaymentPort using Future<Result<T, E>>
 *
 * Demonstrates error handling patterns for activities:
 *
 * 1. Technical errors (network, timeout, etc.) are caught and returned as Result.Error
 *    → Will be wrapped in ActivityError by the activity handler
 *    → Enables Temporal retry policies for transient failures
 *
 * 2. Business errors (insufficient funds, invalid data) are also returned as Result.Error
 *    → Also wrapped in ActivityError but can be identified by error code
 *    → Can be handled differently in workflows (e.g., non-retryable errors)
 *
 * 3. All exceptions are caught and converted to Result.Error - never throw!
 *    → This ensures the activity layer can properly wrap them in ActivityError
 *    → Prevents unexpected exceptions from bypassing error handling
 *
 * The activity handler will wrap all Result.Error values in ActivityError,
 * which is required for Temporal's retry mechanism to work correctly.
 */
export class MockPaymentAdapter implements PaymentPort {
  processPayment(customerId: string, amount: number): Future<Result<PaymentResult, PaymentError>> {
    return Future.make((resolve) => {
      (async () => {
        try {
          logger.info(
            { customerId, amount },
            `💳 Processing payment of $${amount} for customer ${customerId}`,
          );

          // Simulate different error scenarios
          const random = Math.random();

          if (random < 0.05) {
            // Simulate network error (5% chance) - should be retryable
            logger.error(`❌ Network error during payment processing`);
            throw new Error("ECONNREFUSED: Connection refused");
          }

          if (random < 0.1) {
            // Simulate timeout error (5% chance) - should be retryable
            logger.error(`❌ Timeout during payment processing`);
            throw new Error("ETIMEDOUT: Request timeout");
          }

          if (random < 0.2) {
            // Simulate business error (10% chance) - not retryable
            logger.error(`❌ Payment declined - insufficient funds`);
            resolve(
              Result.Error({
                code: "PAYMENT_FAILED",
                message: "Insufficient funds",
                details: { customerId, amount, reason: "insufficient_funds" },
              }),
            );
            return;
          }

          // Success case (80% chance)
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
        } catch (error) {
          // Catch all technical exceptions and convert to Result.Error
          // These will be wrapped in ActivityError by the activity handler for retry
          logger.error({ error }, `❌ Technical error during payment processing`);
          resolve(
            Result.Error({
              code: "PAYMENT_FAILED",
              message: error instanceof Error ? error.message : "Unknown payment error",
              details: { customerId, amount, originalError: error },
            }),
          );
        }
      })();
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
