import { proxyActivities } from "@temporalio/workflow";

type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

type OrderItem = { productId: string; quantity: number; price: number };

type Order = {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
};

type PaymentResult =
  | { status: "success"; transactionId: string; paidAmount: number }
  | { status: "failed" };

type InventoryReservation = { reserved: boolean; reservationId?: string };

type ShippingResult = { trackingNumber: string; estimatedDelivery: string };

type OrderResult = {
  orderId: string;
  status: "completed" | "failed";
  transactionId?: string;
  trackingNumber?: string;
  failureReason?: string;
  errorCode?: string;
};

type Activities = {
  log(args: { level: LogLevel; message: string }): Promise<void>;
  sendNotification(args: { customerId: string; subject: string; message: string }): Promise<void>;
  processPayment(args: { customerId: string; amount: number }): Promise<PaymentResult>;
  reserveInventory(items: OrderItem[]): Promise<InventoryReservation>;
  releaseInventory(reservationId: string): Promise<void>;
  createShipment(args: { orderId: string; customerId: string }): Promise<ShippingResult>;
  refundPayment(transactionId: string): Promise<void>;
};

const activities = proxyActivities<Activities>({
  startToCloseTimeout: "1 minute",
});

export async function processOrder(order: Order): Promise<OrderResult> {
  let paymentTransactionId: string | undefined;

  await activities.log({
    level: "info",
    message: `Starting order processing for ${order.orderId}`,
  });

  await activities.log({
    level: "info",
    message: `Processing payment of $${order.totalAmount}`,
  });

  const paymentResult = await activities.processPayment({
    customerId: order.customerId,
    amount: order.totalAmount,
  });

  if (paymentResult.status === "failed") {
    await activities.log({ level: "error", message: "Payment failed: Card declined" });

    await activities.sendNotification({
      customerId: order.customerId,
      subject: "Order Failed",
      message: `Your order ${order.orderId} could not be processed. Payment was declined.`,
    });

    return {
      orderId: order.orderId,
      status: "failed" as const,
      failureReason: "Payment was declined",
      errorCode: "PAYMENT_FAILED",
    };
  }

  paymentTransactionId = paymentResult.transactionId;
  await activities.log({ level: "info", message: `Payment successful: ${paymentTransactionId}` });

  await activities.log({ level: "info", message: "Reserving inventory" });
  const inventoryResult = await activities.reserveInventory(order.items);

  if (!inventoryResult.reserved) {
    await activities.log({ level: "error", message: "Inventory reservation failed" });
    await activities.log({ level: "info", message: "Rolling back: refunding payment" });
    await activities.refundPayment(paymentTransactionId);

    await activities.sendNotification({
      customerId: order.customerId,
      subject: "Order Failed",
      message: `Your order ${order.orderId} could not be processed. Items out of stock. Payment refunded.`,
    });

    return {
      orderId: order.orderId,
      status: "failed" as const,
      failureReason: "One or more items are out of stock",
      errorCode: "OUT_OF_STOCK",
    };
  }

  await activities.log({
    level: "info",
    message: `Inventory reserved: ${inventoryResult.reservationId}`,
  });

  await activities.log({ level: "info", message: "Creating shipment" });
  const shippingResult = await activities.createShipment({
    orderId: order.orderId,
    customerId: order.customerId,
  });

  await activities.log({
    level: "info",
    message: `Shipment created: ${shippingResult.trackingNumber}`,
  });

  try {
    await activities.sendNotification({
      customerId: order.customerId,
      subject: "Order Confirmed",
      message: `Your order ${order.orderId} is confirmed. Tracking: ${shippingResult.trackingNumber}`,
    });
  } catch (error) {
    await activities.log({
      level: "warn",
      message: `Failed to send confirmation: ${error}`,
    });
  }

  await activities.log({ level: "info", message: `Order ${order.orderId} processed successfully` });

  return {
    orderId: order.orderId,
    status: "completed" as const,
    transactionId: paymentTransactionId,
    trackingNumber: shippingResult.trackingNumber,
  };
}
