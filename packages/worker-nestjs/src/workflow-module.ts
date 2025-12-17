import { Module, DynamicModule, Provider, Type } from "@nestjs/common";
import type { ContractDefinition } from "@temporal-contract/contract";
import type { WorkflowImplementation } from "@temporal-contract/worker/workflow";
import { extractWorkflowsFromProvider } from "./workflow-decorators.js";

/**
 * Token for injecting workflow implementations map
 */
export const WORKFLOW_IMPLEMENTATIONS_TOKEN = "TEMPORAL_CONTRACT_WORKFLOW_IMPLEMENTATIONS";

/**
 * Options for creating a workflows module
 */
export interface WorkflowsModuleOptions<TContract extends ContractDefinition> {
  /**
   * Contract definition
   */
  contract: TContract;

  /**
   * NestJS providers that implement workflows using @ImplementWorkflow decorator
   * These providers will be scanned for decorated methods
   */
  providers: Type<unknown>[];

  /**
   * Optional additional workflow implementations not from providers
   * These will be merged with implementations extracted from providers
   */
  additionalWorkflows?: Record<
    string,
    WorkflowImplementation<TContract, keyof TContract["workflows"]>
  >;
}

/**
 * Create a NestJS module for Temporal workflow implementations
 *
 * This function creates a dynamic NestJS module that:
 * 1. Registers workflow providers with dependency injection
 * 2. Extracts workflow implementations from @ImplementWorkflow decorated methods
 * 3. Exports implementations for use in workflow file generation or testing
 *
 * Note: Temporal workflows must be defined in separate files due to Temporal's
 * workflow isolation requirements. This module is useful for:
 * - Organizing workflow logic in services with DI
 * - Testing workflows with mocked dependencies
 * - Generating workflow files from implementations
 *
 * For production use, workflow implementations must be exported from separate
 * workflow files and loaded via workflowsPath in Worker.create().
 *
 * Inspired by oRPC's NestJS integration pattern with @Implement decorator.
 *
 * @example
 * ```ts
 * // workflows/order-workflow.service.ts
 * import { Injectable } from '@nestjs/common';
 * import { ImplementWorkflow } from '@temporal-contract/worker-nestjs/workflow';
 *
 * @Injectable()
 * export class OrderWorkflowService {
 *   @ImplementWorkflow(orderContract, 'processOrder')
 *   getProcessOrderImplementation() {
 *     return async (context, args) => {
 *       const payment = await context.activities.processPayment({
 *         customerId: args.customerId,
 *         amount: args.amount,
 *       });
 *
 *       if (payment.isError()) {
 *         throw new Error('Payment failed');
 *       }
 *
 *       return { orderId: args.orderId, status: 'completed' };
 *     };
 *   }
 * }
 *
 * // workflows/workflows.module.ts
 * import { createWorkflowsModule } from '@temporal-contract/worker-nestjs/workflow';
 * import { orderContract } from './contract';
 * import { OrderWorkflowService } from './order-workflow.service';
 *
 * export const WorkflowsModule = createWorkflowsModule({
 *   contract: orderContract,
 *   providers: [OrderWorkflowService],
 * });
 *
 * // For testing or accessing implementations
 * import { NestFactory } from '@nestjs/core';
 * import { WORKFLOW_IMPLEMENTATIONS_TOKEN } from '@temporal-contract/worker-nestjs/workflow';
 *
 * const app = await NestFactory.createApplicationContext(AppModule);
 * const implementations = app.get(WORKFLOW_IMPLEMENTATIONS_TOKEN);
 * ```
 */
export function createWorkflowsModule<TContract extends ContractDefinition>(
  options: WorkflowsModuleOptions<TContract>,
): DynamicModule {
  const { contract, providers, additionalWorkflows = {} } = options;

  // Create a factory provider that builds the workflows map
  const workflowImplementationsProvider: Provider = {
    provide: WORKFLOW_IMPLEMENTATIONS_TOKEN,
    useFactory: (...providerInstances: object[]) => {
      // Extract implementations from all providers
      const extractedImplementations: Record<
        string,
        WorkflowImplementation<TContract, keyof TContract["workflows"]>
      > = {};

      for (const providerInstance of providerInstances) {
        const implementations = extractWorkflowsFromProvider<TContract>(providerInstance);
        Object.assign(extractedImplementations, implementations);
      }

      // Merge with additional workflows
      const allWorkflows = {
        ...extractedImplementations,
        ...additionalWorkflows,
      };

      return {
        contract,
        workflows: allWorkflows,
      };
    },
    inject: providers,
  };

  @Module({
    providers: [...providers, workflowImplementationsProvider],
    exports: [WORKFLOW_IMPLEMENTATIONS_TOKEN],
  })
  class WorkflowsModuleClass {}

  return {
    module: WorkflowsModuleClass,
    providers: [...providers, workflowImplementationsProvider],
    exports: [WORKFLOW_IMPLEMENTATIONS_TOKEN],
  };
}
