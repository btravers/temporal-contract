/**
 * NEXUS INTEGRATION TYPES - PROOF OF CONCEPT
 *
 * This file demonstrates how Nexus support could be integrated into temporal-contract.
 * These types are NOT yet implemented in the actual package but show the proposed API design.
 *
 * See docs/NEXUS_INTEGRATION.md for detailed documentation.
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { AnySchema, WorkflowDefinition, ActivityDefinition } from "./types.js";

/**
 * Definition of a Nexus operation
 * Similar to ActivityDefinition but for cross-namespace operations
 *
 * @example
 * ```typescript
 * const processPayment = {
 *   input: z.object({ amount: z.number(), customerId: z.string() }),
 *   output: z.object({ transactionId: z.string(), status: z.enum(['success', 'failed']) }),
 * };
 * ```
 */
export interface NexusOperationDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

/**
 * Definition of a Nexus service containing multiple operations
 *
 * @example
 * ```typescript
 * const PaymentService = {
 *   operations: {
 *     processPayment: { input: ..., output: ... },
 *     refundPayment: { input: ..., output: ... },
 *   },
 * };
 * ```
 */
export interface NexusServiceDefinition<
  TOperations extends Record<string, NexusOperationDefinition> = Record<
    string,
    NexusOperationDefinition
  >,
> {
  readonly operations: TOperations;
}

/**
 * Extended ContractDefinition that includes Nexus services
 * This would replace the current ContractDefinition when Nexus support is added
 *
 * @example
 * ```typescript
 * const contract = defineContract({
 *   taskQueue: 'payments',
 *   workflows: { ... },
 *   activities: { ... },
 *   nexusServices: {
 *     PaymentService: {
 *       operations: {
 *         processPayment: { input: ..., output: ... },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export interface ContractDefinitionWithNexus<
  TWorkflows extends Record<string, WorkflowDefinition> = Record<string, WorkflowDefinition>,
  TActivities extends Record<string, ActivityDefinition> = Record<string, ActivityDefinition>,
  TNexusServices extends Record<string, NexusServiceDefinition> = Record<
    string,
    NexusServiceDefinition
  >,
> {
  readonly taskQueue: string;
  readonly workflows: TWorkflows;
  readonly activities?: TActivities;
  readonly nexusServices?: TNexusServices;
}

/**
 * WORKER PERSPECTIVE - Nexus operation handler type inference
 * Worker receives the parsed input and returns the raw output
 */

/**
 * Infer input type from a Nexus operation definition (worker perspective)
 */
export type WorkerInferNexusOperationInput<T extends NexusOperationDefinition> =
  StandardSchemaV1.InferOutput<T["input"]>;

/**
 * Infer output type from a Nexus operation definition (worker perspective)
 */
export type WorkerInferNexusOperationOutput<T extends NexusOperationDefinition> =
  StandardSchemaV1.InferInput<T["output"]>;

/**
 * Infer the handler function signature for a Nexus operation (worker perspective)
 *
 * @example
 * ```typescript
 * type ProcessPaymentHandler = WorkerInferNexusOperationHandler<typeof processPaymentOperation>;
 * // (args: { amount: number; customerId: string }) => Promise<{ transactionId: string; status: 'success' | 'failed' }>
 * ```
 */
export type WorkerInferNexusOperationHandler<TOperation extends NexusOperationDefinition> = (
  args: WorkerInferNexusOperationInput<TOperation>,
) => Promise<WorkerInferNexusOperationOutput<TOperation>>;

/**
 * Infer all operation handlers for a Nexus service (worker perspective)
 *
 * @example
 * ```typescript
 * type PaymentServiceHandlers = WorkerInferNexusServiceHandlers<typeof PaymentService>;
 * // {
 * //   processPayment: (args: { ... }) => Promise<{ ... }>;
 * //   refundPayment: (args: { ... }) => Promise<{ ... }>;
 * // }
 * ```
 */
export type WorkerInferNexusServiceHandlers<T extends NexusServiceDefinition> = {
  [K in keyof T["operations"]]: WorkerInferNexusOperationHandler<T["operations"][K]>;
};

/**
 * Infer all Nexus service handlers from a contract (worker perspective)
 *
 * @example
 * ```typescript
 * type AllNexusHandlers = WorkerInferNexusServices<typeof myContract>;
 * // {
 * //   PaymentService: { processPayment: ..., refundPayment: ... };
 * //   InventoryService: { reserveItems: ..., releaseItems: ... };
 * // }
 * ```
 */
export type WorkerInferNexusServices<TContract extends ContractDefinitionWithNexus> =
  TContract["nexusServices"] extends Record<string, NexusServiceDefinition>
    ? {
        [K in keyof TContract["nexusServices"]]: WorkerInferNexusServiceHandlers<
          TContract["nexusServices"][K]
        >;
      }
    : {};

/**
 * CLIENT PERSPECTIVE - Nexus operation client type inference
 * Client sends the raw input and receives the parsed output
 */

/**
 * Infer input type from a Nexus operation definition (client perspective)
 */
export type ClientInferNexusOperationInput<T extends NexusOperationDefinition> =
  StandardSchemaV1.InferInput<T["input"]>;

/**
 * Infer output type from a Nexus operation definition (client perspective)
 */
export type ClientInferNexusOperationOutput<T extends NexusOperationDefinition> =
  StandardSchemaV1.InferOutput<T["output"]>;

/**
 * Infer the client function signature for a Nexus operation (client perspective)
 *
 * @example
 * ```typescript
 * type ProcessPaymentClient = ClientInferNexusOperationInvoker<typeof processPaymentOperation>;
 * // (args: { amount: number; customerId: string }) => Promise<{ transactionId: string; status: 'success' | 'failed' }>
 * ```
 */
export type ClientInferNexusOperationInvoker<TOperation extends NexusOperationDefinition> = (
  args: ClientInferNexusOperationInput<TOperation>,
) => Promise<ClientInferNexusOperationOutput<TOperation>>;

/**
 * Infer all operation invokers for a Nexus service (client perspective)
 */
export type ClientInferNexusServiceOperations<T extends NexusServiceDefinition> = {
  [K in keyof T["operations"]]: ClientInferNexusOperationInvoker<T["operations"][K]>;
};

/**
 * Infer all Nexus service operations from a contract (client perspective)
 *
 * @example
 * ```typescript
 * type AllNexusOperations = ClientInferNexusServices<typeof myContract>;
 * // {
 * //   PaymentService: { processPayment: ..., refundPayment: ... };
 * //   InventoryService: { reserveItems: ..., releaseItems: ... };
 * // }
 * ```
 */
export type ClientInferNexusServices<TContract extends ContractDefinitionWithNexus> =
  TContract["nexusServices"] extends Record<string, NexusServiceDefinition>
    ? {
        [K in keyof TContract["nexusServices"]]: ClientInferNexusServiceOperations<
          TContract["nexusServices"][K]
        >;
      }
    : {};

/**
 * UTILITY TYPES
 */

/**
 * Extract service names from a contract as a union type
 *
 * @example
 * ```typescript
 * type MyServiceNames = InferNexusServiceNames<typeof myContract>;
 * // "PaymentService" | "InventoryService"
 * ```
 */
export type InferNexusServiceNames<TContract extends ContractDefinitionWithNexus> =
  TContract["nexusServices"] extends Record<string, NexusServiceDefinition>
    ? keyof TContract["nexusServices"] & string
    : never;

/**
 * Extract operation names from a service as a union type
 *
 * @example
 * ```typescript
 * type PaymentOperations = InferNexusOperationNames<typeof myContract, "PaymentService">;
 * // "processPayment" | "refundPayment"
 * ```
 */
export type InferNexusOperationNames<
  TContract extends ContractDefinitionWithNexus,
  TServiceName extends InferNexusServiceNames<TContract>,
> =
  TContract["nexusServices"] extends Record<string, NexusServiceDefinition>
    ? keyof TContract["nexusServices"][TServiceName]["operations"] & string
    : never;

/**
 * Infer the handler type for a specific Nexus operation (worker perspective)
 *
 * @example
 * ```typescript
 * const processPayment: NexusOperationHandler<
 *   typeof myContract,
 *   "PaymentService",
 *   "processPayment"
 * > = async ({ amount, customerId }) => {
 *   // Implementation
 *   return { transactionId: 'tx-123', status: 'success' };
 * };
 * ```
 */
export type NexusOperationHandler<
  TContract extends ContractDefinitionWithNexus,
  TServiceName extends InferNexusServiceNames<TContract>,
  TOperationName extends InferNexusOperationNames<TContract, TServiceName>,
> =
  TContract["nexusServices"] extends Record<string, NexusServiceDefinition>
    ? (
        args: WorkerInferNexusOperationInput<
          TContract["nexusServices"][TServiceName]["operations"][TOperationName]
        >,
      ) => Promise<
        WorkerInferNexusOperationOutput<
          TContract["nexusServices"][TServiceName]["operations"][TOperationName]
        >
      >
    : never;

/**
 * BUILDER FUNCTIONS (Proposed API)
 * These would be added to builder.ts when Nexus support is implemented
 */

/**
 * Builder for creating Nexus operation definitions
 *
 * @template TOperation - A NexusOperationDefinition containing input and output schemas
 * @param definition - The Nexus operation definition with typed input/output schemas
 * @returns The same definition with preserved types
 *
 * @example
 * ```typescript
 * const processPayment = defineNexusOperation({
 *   input: z.object({ amount: z.number(), customerId: z.string() }),
 *   output: z.object({ transactionId: z.string(), status: z.enum(['success', 'failed']) }),
 * });
 * ```
 */
export function defineNexusOperation<TOperation extends NexusOperationDefinition>(
  definition: TOperation,
): TOperation {
  return definition;
}

/**
 * Builder for creating Nexus service definitions
 *
 * @template TService - A NexusServiceDefinition containing a record of operations
 * @param definition - The Nexus service definition with typed operations
 * @returns The same definition with preserved types
 *
 * @example
 * ```typescript
 * const PaymentService = defineNexusService({
 *   operations: {
 *     processPayment: defineNexusOperation({ ... }),
 *     refundPayment: defineNexusOperation({ ... }),
 *   },
 * });
 * ```
 */
export function defineNexusService<TService extends NexusServiceDefinition>(
  definition: TService,
): TService {
  return definition;
}

/**
 * USAGE EXAMPLE
 *
 * This example demonstrates the complete type-safe Nexus workflow:
 *
 * ```typescript
 * import { defineContract, defineNexusService, defineNexusOperation } from '@temporal-contract/contract';
 * import { z } from 'zod';
 *
 * // 1. Define contract with Nexus service
 * const paymentContract = defineContract({
 *   taskQueue: 'payments',
 *   workflows: { ... },
 *   nexusServices: {
 *     PaymentService: defineNexusService({
 *       operations: {
 *         processPayment: defineNexusOperation({
 *           input: z.object({
 *             amount: z.number().positive(),
 *             customerId: z.string().uuid(),
 *           }),
 *           output: z.object({
 *             transactionId: z.string(),
 *             status: z.enum(['success', 'failed']),
 *           }),
 *         }),
 *       },
 *     }),
 *   },
 * });
 *
 * // 2. Worker implementation (type-safe handlers)
 * import { createNexusHandlers } from '@temporal-contract/worker';
 *
 * const nexusHandlers = createNexusHandlers(paymentContract, {
 *   PaymentService: {
 *     processPayment: async ({ amount, customerId }) => {
 *       // ✅ Fully typed parameters
 *       // ✅ Input automatically validated
 *       const payment = await processPaymentInDatabase(customerId, amount);
 *       // ✅ Return value validated against schema
 *       return {
 *         transactionId: payment.id,
 *         status: 'success',
 *       };
 *     },
 *   },
 * });
 *
 * // 3. Client usage (type-safe invocation)
 * import { createNexusClient } from '@temporal-contract/client';
 *
 * const nexusClient = createNexusClient<typeof paymentContract>(connection, {
 *   namespace: 'payments-ns',
 * });
 *
 * // ✅ Fully typed invocation
 * const result = await nexusClient.invoke('PaymentService', 'processPayment', {
 *   amount: 100,
 *   customerId: 'cust-123',
 * });
 *
 * // ❌ TypeScript errors caught at compile time
 * await nexusClient.invoke('PaymentService', 'processPayment', {
 *   amount: -50, // Error: amount must be positive
 *   customerId: 'invalid', // Error: customerId must be UUID
 * });
 * ```
 */
