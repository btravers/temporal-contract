import { Future, Result } from "@swan-io/boxed";
import type { PaymentPort, PaymentError } from "../ports/payment.port.js";
import type { PaymentResult } from "../entities/order.schema.js";

/**
 * Process Payment Use Case
 *
 * Business logic for processing payments
 */
export class ProcessPaymentUseCase {
  constructor(private readonly paymentPort: PaymentPort) {}

  execute(customerId: string, amount: number): Future<Result<PaymentResult, PaymentError>> {
    // Business validation
    if (amount <= 0) {
      return Future.value(
        Result.Error({
          code: "PAYMENT_FAILED" as const,
          message: "Payment amount must be positive",
          details: { amount },
        }),
      );
    }

    if (!customerId || customerId.trim() === "") {
      return Future.value(
        Result.Error({
          code: "PAYMENT_FAILED" as const,
          message: "Customer ID is required",
          details: { customerId },
        }),
      );
    }

    // Delegate to payment port
    return this.paymentPort.processPayment(customerId, amount);
  }
}
