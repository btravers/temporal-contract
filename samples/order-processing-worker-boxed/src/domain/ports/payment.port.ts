import type { Future, Result } from "@swan-io/boxed";
import type { PaymentResult } from "../entities/order.schema.js";

export type PaymentError = {
  code: "PAYMENT_FAILED" | "REFUND_FAILED" | "INVALID_TRANSACTION";
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Payment Port - Interface for payment operations
 */
export interface PaymentPort {
  /**
   * Process a payment for a customer
   */
  processPayment(customerId: string, amount: number): Future<Result<PaymentResult, PaymentError>>;

  /**
   * Refund a payment transaction
   */
  refundPayment(transactionId: string): Future<Result<void, PaymentError>>;
}
