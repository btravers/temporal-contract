import { Schema } from "effect";
import { defineEffectContract } from "@temporal-contract/contract-effect";

export const OrderItemSchema = Schema.Struct({
  productId: Schema.String,
  quantity: Schema.Number.pipe(Schema.greaterThan(0)),
  price: Schema.Number.pipe(Schema.greaterThan(0)),
});

export const OrderSchema = Schema.Struct({
  orderId: Schema.String,
  customerId: Schema.String,
  items: Schema.Array(OrderItemSchema),
  totalAmount: Schema.Number.pipe(Schema.greaterThan(0)),
});

export const PaymentResultSchema = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("success"),
    transactionId: Schema.String,
    paidAmount: Schema.Number,
  }),
  Schema.Struct({
    status: Schema.Literal("failed"),
  }),
);

export const InventoryReservationSchema = Schema.Struct({
  reserved: Schema.Boolean,
  reservationId: Schema.optional(Schema.String),
});

export const ShippingResultSchema = Schema.Struct({
  trackingNumber: Schema.String,
  estimatedDelivery: Schema.String,
});

export const OrderResultSchema = Schema.Struct({
  orderId: Schema.String,
  status: Schema.Union(Schema.Literal("completed"), Schema.Literal("failed")),
  transactionId: Schema.optional(Schema.String),
  trackingNumber: Schema.optional(Schema.String),
  failureReason: Schema.optional(Schema.String),
  errorCode: Schema.optional(Schema.String),
});

export const orderEffectContract = defineEffectContract({
  taskQueue: "order-processing-effect",

  activities: {
    log: {
      input: Schema.Struct({
        level: Schema.Union(
          Schema.Literal("fatal"),
          Schema.Literal("error"),
          Schema.Literal("warn"),
          Schema.Literal("info"),
          Schema.Literal("debug"),
          Schema.Literal("trace"),
        ),
        message: Schema.String,
      }),
      output: Schema.Void,
    },

    sendNotification: {
      input: Schema.Struct({
        customerId: Schema.String,
        subject: Schema.String,
        message: Schema.String,
      }),
      output: Schema.Void,
    },
  },

  workflows: {
    processOrder: {
      input: OrderSchema,
      output: OrderResultSchema,

      activities: {
        processPayment: {
          input: Schema.Struct({ customerId: Schema.String, amount: Schema.Number }),
          output: PaymentResultSchema,
        },

        reserveInventory: {
          input: Schema.Array(OrderItemSchema),
          output: InventoryReservationSchema,
        },

        releaseInventory: {
          input: Schema.String,
          output: Schema.Void,
        },

        createShipment: {
          input: Schema.Struct({ orderId: Schema.String, customerId: Schema.String }),
          output: ShippingResultSchema,
        },

        refundPayment: {
          input: Schema.String,
          output: Schema.Void,
        },
      },
    },
  },
});
