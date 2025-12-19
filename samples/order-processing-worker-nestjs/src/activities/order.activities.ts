import { Injectable } from "@nestjs/common";
import { TemporalActivity } from "@temporal-contract/worker-nestjs";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { PaymentService } from "../domain/payment.service.js";
import { InventoryService } from "../domain/inventory.service.js";
import { ShipmentService } from "../domain/shipment.service.js";

/**
 * Order processing activities organized in a NestJS service
 *
 * Using the @TemporalActivity decorator to map methods to workflow activities.
 * This provides a clean, class-based approach to organizing activities with
 * full access to NestJS dependency injection.
 */
@Injectable()
export class OrderActivitiesService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly inventoryService: InventoryService,
    private readonly shipmentService: ShipmentService,
  ) {}

  /**
   * Process payment for an order
   */
  @TemporalActivity("processOrder", "processPayment")
  async processPayment(args: {
    customerId: string;
    amount: number;
  }): Promise<
    Future<
      Result<
        { status: "success"; transactionId: string; paidAmount: number } | { status: "failed" },
        ActivityError
      >
    >
  > {
    return Future.make(async (resolve) => {
      try {
        const transactionId = await this.paymentService.charge(args.customerId, args.amount);
        resolve(
          Result.Ok({
            status: "success" as const,
            transactionId,
            paidAmount: args.amount,
          }),
        );
      } catch (error) {
        resolve(
          Result.Error(
            new ActivityError(
              "PAYMENT_FAILED",
              error instanceof Error ? error.message : "Payment processing failed",
              error,
            ),
          ),
        );
      }
    });
  }

  /**
   * Reserve inventory for an order
   */
  @TemporalActivity("processOrder", "reserveInventory")
  async reserveInventory(
    items: Array<{ productId: string; quantity: number; price: number }>,
  ): Promise<Future<Result<{ reserved: boolean; reservationId?: string }, ActivityError>>> {
    return Future.make(async (resolve) => {
      try {
        if (items.length === 0) {
          resolve(Result.Ok({ reserved: true }));
          return;
        }

        // Reserve all items (in a real app, this would be more sophisticated)
        const reservationId = await this.inventoryService.reserve(
          items[0]!.productId,
          items[0]!.quantity,
        );
        resolve(Result.Ok({ reserved: true, reservationId }));
      } catch (error) {
        resolve(
          Result.Error(
            new ActivityError(
              "INVENTORY_RESERVATION_FAILED",
              error instanceof Error ? error.message : "Inventory reservation failed",
              error,
            ),
          ),
        );
      }
    });
  }

  /**
   * Release inventory reservation
   */
  @TemporalActivity("processOrder", "releaseInventory")
  async releaseInventory(reservationId: string): Promise<Future<Result<void, ActivityError>>> {
    return Future.make(async (resolve) => {
      try {
        await this.inventoryService.release(reservationId);
        resolve(Result.Ok(undefined));
      } catch (error) {
        resolve(
          Result.Error(
            new ActivityError(
              "INVENTORY_RELEASE_FAILED",
              error instanceof Error ? error.message : "Inventory release failed",
              error,
            ),
          ),
        );
      }
    });
  }

  /**
   * Create shipment for an order
   */
  @TemporalActivity("processOrder", "createShipment")
  async createShipment(args: {
    orderId: string;
    customerId: string;
  }): Promise<
    Future<Result<{ trackingNumber: string; estimatedDelivery: string }, ActivityError>>
  > {
    return Future.make(async (resolve) => {
      try {
        const shipment = await this.shipmentService.create(args.orderId, args.customerId);
        resolve(
          Result.Ok({
            trackingNumber: shipment.trackingNumber,
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        );
      } catch (error) {
        resolve(
          Result.Error(
            new ActivityError(
              "SHIPMENT_CREATION_FAILED",
              error instanceof Error ? error.message : "Shipment creation failed",
              error,
            ),
          ),
        );
      }
    });
  }

  /**
   * Refund a payment
   */
  @TemporalActivity("processOrder", "refundPayment")
  async refundPayment(transactionId: string): Promise<Future<Result<void, ActivityError>>> {
    return Future.make(async (resolve) => {
      try {
        await this.paymentService.refund(transactionId);
        resolve(Result.Ok(undefined));
      } catch (error) {
        resolve(
          Result.Error(
            new ActivityError(
              "REFUND_FAILED",
              error instanceof Error ? error.message : "Refund failed",
              error,
            ),
          ),
        );
      }
    });
  }
}
