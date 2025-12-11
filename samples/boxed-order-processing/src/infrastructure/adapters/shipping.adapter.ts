import { Future, Result } from "@swan-io/boxed";
import type { ShippingPort, ShippingError } from "../../domain/ports/shipping.port.js";
import type { ShippingResult } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

/**
 * Mock Shipping Adapter
 *
 * Concrete implementation of ShippingPort using Future<Result<T, E>>
 */
export class MockShippingAdapter implements ShippingPort {
  createShipment(
    orderId: string,
    _customerId: string,
  ): Future<Result<ShippingResult, ShippingError>> {
    return Future.fromPromise(
      Promise.resolve().then(() => {
        logger.info({ orderId }, `📮 Creating shipment for order ${orderId}`);

        // Simulate shipment creation with 98% success rate
        const success = Math.random() > 0.02;

        if (!success) {
          logger.error(`❌ Shipment creation failed`);
          throw {
            code: "SHIPMENT_FAILED",
            message: "Carrier service temporarily unavailable",
            details: { orderId },
          };
        }

        const trackingNumber = `TRACK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

        const result: ShippingResult = {
          trackingNumber,
          estimatedDelivery,
        };

        logger.info({ trackingNumber }, `✅ Shipment created: ${trackingNumber}`);
        return result;
      })
    ).mapError(error => {
      // Convert thrown errors to ShippingError
      if (error && typeof error === 'object' && 'code' in error) {
        return error as ShippingError;
      }
      return {
        code: "SHIPMENT_FAILED",
        message: error instanceof Error ? error.message : "Unknown shipping error",
        details: { orderId },
      };
    });
  }
}
