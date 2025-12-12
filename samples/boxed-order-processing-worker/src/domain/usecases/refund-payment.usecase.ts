import { Future, Result } from "@swan-io/boxed";
import type { PaymentPort, PaymentError } from "../ports/payment.port.js";

/**
 * Refund Payment Use Case
 *
 * Business logic for refunding payments
 */
export class RefundPaymentUseCase {
  constructor(private readonly paymentPort: PaymentPort) {}

  execute(transactionId: string): Future<Result<void, PaymentError>> {
    // Business validation
    if (!transactionId || transactionId.trim() === "") {
      return Future.value(
        Result.Error({
          code: "INVALID_TRANSACTION" as const,
          message: "Transaction ID is required",
          details: { transactionId },
        }),
      );
    }

    // Delegate to payment port
    return this.paymentPort.refundPayment(transactionId);
  }
}
