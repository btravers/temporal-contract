import { Future, Result } from "@temporal-contract/boxed";
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { Injectable, Inject } from "@nestjs/common";
import { ProcessPaymentUseCase } from "./domain/usecases/process-payment.usecase.js";
import { ReserveInventoryUseCase } from "./domain/usecases/reserve-inventory.usecase.js";
import { ReleaseInventoryUseCase } from "./domain/usecases/release-inventory.usecase.js";
import { CreateShipmentUseCase } from "./domain/usecases/create-shipment.usecase.js";
import { SendNotificationUseCase } from "./domain/usecases/send-notification.usecase.js";
import { RefundPaymentUseCase } from "./domain/usecases/refund-payment.usecase.js";
import type { PinoLoggerAdapter } from "./infrastructure/adapters/logger.adapter.js";
import { LOGGER_ADAPTER } from "./dependencies.module.js";

/**
 * Injectable provider that creates type-safe activities with dependency injection
 *
 * This demonstrates how to use NestJS DI with Temporal activities:
 * - Use cases are injected via constructor
 * - Activities are created using declareActivitiesHandler
 * - All activities follow the Result/Future pattern for explicit error handling
 */
@Injectable()
export class ActivitiesProvider {
  constructor(
    @Inject(LOGGER_ADAPTER) private readonly loggerAdapter: PinoLoggerAdapter,
    @Inject(ProcessPaymentUseCase) private readonly processPaymentUseCase: ProcessPaymentUseCase,
    @Inject(ReserveInventoryUseCase)
    private readonly reserveInventoryUseCase: ReserveInventoryUseCase,
    @Inject(ReleaseInventoryUseCase)
    private readonly releaseInventoryUseCase: ReleaseInventoryUseCase,
    @Inject(CreateShipmentUseCase) private readonly createShipmentUseCase: CreateShipmentUseCase,
    @Inject(SendNotificationUseCase)
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    @Inject(RefundPaymentUseCase) private readonly refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  /**
   * Create the activities handler with Result/Future pattern
   * All dependencies are available via NestJS DI
   */
  createActivities() {
    return declareActivitiesHandler({
      contract: orderProcessingContract,
      activities: {
        log: ({ level, message }) => {
          this.loggerAdapter.log(level, message);
          return Future.value(Result.Ok(undefined));
        },

        sendNotification: ({ customerId, subject, message }) => {
          return Future.fromPromise(
            this.sendNotificationUseCase.execute(customerId, subject, message),
          ).mapError(
            (error) =>
              new ActivityError(
                "NOTIFICATION_FAILED",
                error instanceof Error ? error.message : "Failed to send notification",
                error,
              ),
          );
        },

        processOrder: {
          processPayment: ({ customerId, amount }) => {
            return Future.fromPromise(
              this.processPaymentUseCase.execute(customerId, amount),
            ).mapError(
              (error) =>
                new ActivityError(
                  "PAYMENT_FAILED",
                  error instanceof Error ? error.message : "Payment processing failed",
                  error,
                ),
            );
          },

          reserveInventory: (items) => {
            return Future.fromPromise(this.reserveInventoryUseCase.execute(items)).mapError(
              (error) =>
                new ActivityError(
                  "INVENTORY_RESERVATION_FAILED",
                  error instanceof Error ? error.message : "Inventory reservation failed",
                  error,
                ),
            );
          },

          releaseInventory: (reservationId) => {
            return Future.fromPromise(this.releaseInventoryUseCase.execute(reservationId)).mapError(
              (error) =>
                new ActivityError(
                  "INVENTORY_RELEASE_FAILED",
                  error instanceof Error ? error.message : "Inventory release failed",
                  error,
                ),
            );
          },

          createShipment: ({ orderId, customerId }) => {
            return Future.fromPromise(
              this.createShipmentUseCase.execute(orderId, customerId),
            ).mapError(
              (error) =>
                new ActivityError(
                  "SHIPMENT_CREATION_FAILED",
                  error instanceof Error ? error.message : "Shipment creation failed",
                  error,
                ),
            );
          },

          refundPayment: (transactionId) => {
            return Future.fromPromise(this.refundPaymentUseCase.execute(transactionId)).mapError(
              (error) =>
                new ActivityError(
                  "REFUND_FAILED",
                  error instanceof Error ? error.message : "Refund failed",
                  error,
                ),
            );
          },
        },
      },
    });
  }
}
