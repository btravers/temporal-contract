import { Injectable } from "@nestjs/common";

/**
 * Mock inventory service for demonstration
 */
@Injectable()
export class InventoryService {
  private reservations = new Map<string, { productId: string; quantity: number }>();

  async reserve(productId: string, quantity: number): Promise<string> {
    console.log(`Reserving ${quantity} units of product ${productId}`);
    await this.delay(50);

    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.reservations.set(reservationId, { productId, quantity });

    return reservationId;
  }

  async release(reservationId: string): Promise<void> {
    console.log(`Releasing reservation: ${reservationId}`);
    await this.delay(50);
    this.reservations.delete(reservationId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
