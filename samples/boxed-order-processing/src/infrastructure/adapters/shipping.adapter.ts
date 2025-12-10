import { Future, Result } from "@swan-io/boxed";
import type { ShippingPort, ShippingError } from "../../domain/ports/shipping.port.js";
import type { ShippingResult } from "../../domain/entities/order.schema.js";
import { pino } from "pino";

const logger = pino();

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
    return Future.make((resolve) => {
      logger.info({ orderId }, `📮 Creating shipment for order ${orderId}`);

      // Simulate shipment creation with 98% success rate
      const success = Math.random() > 0.02;

      if (success) {
        const trackingNumber = `TRACK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

        const result: ShippingResult = {
          trackingNumber,
          estimatedDelivery,
        };

        logger.info({ trackingNumber }, `✅ Shipment created: ${trackingNumber}`);
        resolve(Result.Ok(result));
      } else {
        logger.error(`❌ Shipment creation failed`);
        resolve(
          Result.Error({
            code: "SHIPMENT_FAILED",
            message: "Carrier service temporarily unavailable",
            details: { orderId },
          }),
        );
      }
    });
  }
}
