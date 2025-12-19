import { Injectable } from "@nestjs/common";

/**
 * Mock shipment service for demonstration
 */
@Injectable()
export class ShipmentService {
  async create(
    orderId: string,
    customerId: string,
  ): Promise<{ shipmentId: string; trackingNumber: string }> {
    console.log(`Creating shipment for order ${orderId} (customer: ${customerId})`);
    await this.delay(100);

    return {
      shipmentId: `ship_${Date.now()}`,
      trackingNumber: `TRK${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
