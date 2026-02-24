import type { PaymentPort } from "../ports/payment.port.js";
import type { PaymentResult } from "../entities/order.schema.js";

export class ProcessPaymentUseCase {
  constructor(private readonly paymentPort: PaymentPort) {}

  async execute(customerId: string, amount: number): Promise<PaymentResult> {
    if (amount <= 0) throw new Error("Payment amount must be positive");
    if (!customerId.trim()) throw new Error("Customer ID is required");
    return this.paymentPort.processPayment(customerId, amount);
  }
}
