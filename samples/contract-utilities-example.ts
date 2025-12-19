/**
 * Example demonstrating the new contract helper utilities
 *
 * This example shows how to use the introspection and debugging utilities
 * to analyze and compare contracts.
 */

import { defineContract } from "@temporal-contract/contract";
import {
  getContractStats,
  getAllActivityNames,
  debugContract,
  validateContractNaming,
  compareContracts,
} from "@temporal-contract/contract";
import { z } from "zod";

// Define a sample e-commerce contract
const ecommerceContract = defineContract({
  taskQueue: "ecommerce",
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string().uuid(),
        customerId: z.string().uuid(),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().positive(),
            price: z.number().positive(),
          }),
        ),
      }),
      output: z.object({
        success: z.boolean(),
        orderNumber: z.string().optional(),
        errorMessage: z.string().optional(),
      }),
      activities: {
        validateInventory: {
          input: z.object({
            items: z.array(
              z.object({
                productId: z.string(),
                quantity: z.number(),
              }),
            ),
          }),
          output: z.object({
            available: z.boolean(),
            unavailableItems: z.array(z.string()).optional(),
          }),
        },
        processPayment: {
          input: z.object({
            customerId: z.string(),
            amount: z.number().positive(),
            currency: z.string().length(3),
          }),
          output: z.object({
            transactionId: z.string(),
            status: z.enum(["approved", "declined", "pending"]),
          }),
        },
        reserveInventory: {
          input: z.object({
            items: z.array(
              z.object({
                productId: z.string(),
                quantity: z.number(),
              }),
            ),
          }),
          output: z.object({
            reservationId: z.string(),
          }),
        },
        createShipment: {
          input: z.object({
            orderId: z.string(),
            items: z.array(z.object({ productId: z.string(), quantity: z.number() })),
          }),
          output: z.object({
            trackingNumber: z.string(),
          }),
        },
      },
      signals: {
        cancelOrder: {
          input: z.object({
            reason: z.string(),
          }),
        },
      },
      queries: {
        getOrderStatus: {
          input: z.void(),
          output: z.object({
            status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
            updatedAt: z.date(),
          }),
        },
      },
      updates: {
        updateShippingAddress: {
          input: z.object({
            address: z.object({
              street: z.string(),
              city: z.string(),
              zipCode: z.string(),
              country: z.string(),
            }),
          }),
          output: z.object({
            success: z.boolean(),
            message: z.string().optional(),
          }),
        },
      },
    },
    sendNotification: {
      input: z.object({
        customerId: z.string(),
        type: z.enum(["order_confirmation", "shipment_update", "delivery_notice"]),
        data: z.record(z.unknown()),
      }),
      output: z.object({
        sent: z.boolean(),
        messageId: z.string().optional(),
      }),
    },
  },
  activities: {
    logEvent: {
      input: z.object({
        level: z.enum(["info", "warn", "error"]),
        message: z.string(),
        metadata: z.record(z.unknown()).optional(),
      }),
      output: z.void(),
    },
  },
});

// Example 1: Get contract statistics
console.log("=== Contract Statistics ===");
const stats = getContractStats(ecommerceContract);
console.log(`Workflows: ${stats.workflowCount}`);
console.log(`Total Activities: ${stats.totalActivityCount}`);
console.log(`Global Activities: ${stats.globalActivityCount}`);
console.log(`Signals: ${stats.signalCount}`);
console.log(`Queries: ${stats.queryCount}`);
console.log(`Updates: ${stats.updateCount}`);
console.log();

// Example 2: Get all activity names
console.log("=== All Activity Names ===");
const activityNames = getAllActivityNames(ecommerceContract);
console.log(activityNames.join(", "));
console.log();

// Example 3: Debug contract structure
console.log("=== Contract Structure ===");
console.log(debugContract(ecommerceContract));
console.log();

// Example 4: Validate naming conventions
console.log("=== Naming Validation ===");
const namingIssues = validateContractNaming(ecommerceContract);
if (namingIssues.length === 0) {
  console.log("✓ All names follow camelCase convention");
} else {
  console.log("⚠️  Naming issues found:");
  namingIssues.forEach((issue) => console.log(`  - ${issue}`));
}
console.log();

// Example 5: Compare contract versions
console.log("=== Contract Version Comparison ===");

// Simulate an updated contract with new features
const ecommerceContractV2 = defineContract({
  taskQueue: "ecommerce",
  workflows: {
    processOrder: ecommerceContract.workflows.processOrder,
    sendNotification: ecommerceContract.workflows.sendNotification,
    // New workflow in v2
    handleReturn: {
      input: z.object({
        orderId: z.string(),
        reason: z.string(),
      }),
      output: z.object({
        refundId: z.string(),
        refundAmount: z.number(),
      }),
    },
  },
  activities: {
    logEvent: ecommerceContract.activities!.logEvent,
    // New global activity in v2
    sendSMS: {
      input: z.object({
        phoneNumber: z.string(),
        message: z.string(),
      }),
      output: z.object({
        messageId: z.string(),
      }),
    },
  },
});

const diff = compareContracts(ecommerceContract, ecommerceContractV2);
console.log(`Task Queue Changed: ${diff.taskQueueChanged ? "Yes" : "No"}`);
console.log(`Added Workflows: ${diff.addedWorkflows.join(", ") || "None"}`);
console.log(`Removed Workflows: ${diff.removedWorkflows.join(", ") || "None"}`);
console.log(`Modified Workflows: ${diff.modifiedWorkflows.join(", ") || "None"}`);
console.log(`Added Global Activities: ${diff.addedGlobalActivities.join(", ") || "None"}`);
console.log(`Removed Global Activities: ${diff.removedGlobalActivities.join(", ") || "None"}`);

// Example output:
// === Contract Statistics ===
// Workflows: 2
// Total Activities: 5
// Global Activities: 1
// Signals: 1
// Queries: 1
// Updates: 1
//
// === All Activity Names ===
// createShipment, logEvent, processPayment, reserveInventory, validateInventory
//
// === Contract Structure ===
// Contract: ecommerce
//   Workflows: 2
//     - processOrder (activities: 4, signals: 1, queries: 1, updates: 1)
//     - sendNotification
//   Global Activities: 1
//
// === Naming Validation ===
// ✓ All names follow camelCase convention
//
// === Contract Version Comparison ===
// Task Queue Changed: No
// Added Workflows: handleReturn
// Removed Workflows: None
// Modified Workflows: None
// Added Global Activities: sendSMS
// Removed Global Activities: None
