import type { PaymentResult } from "../entities/order.schema.js";

/**
 * Payment Port - Interface for payment operations
 */
export interface PaymentPort {
  /**
   * Process a payment for a customer
   */
  processPayment(customerId: string, amount: number): Promise<PaymentResult>;

  /**
   * Refund a payment transaction
   */
  refundPayment(transactionId: string): Promise<void>;
}
