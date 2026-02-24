import type { PaymentResult } from "../entities/order.schema.js";

export type PaymentPort = {
  processPayment(customerId: string, amount: number): Promise<PaymentResult>;
  refundPayment(transactionId: string): Promise<void>;
};
