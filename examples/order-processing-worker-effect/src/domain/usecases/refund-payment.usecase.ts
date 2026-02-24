import type { PaymentPort } from "../ports/payment.port.js";

export class RefundPaymentUseCase {
  constructor(private readonly paymentPort: PaymentPort) {}

  async execute(transactionId: string): Promise<void> {
    if (!transactionId.trim()) throw new Error("Transaction ID is required");
    return this.paymentPort.refundPayment(transactionId);
  }
}
