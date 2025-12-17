import "reflect-metadata";
import type { ContractDefinition } from "@temporal-contract/contract";
import type { WorkflowImplementation } from "@temporal-contract/worker/workflow";

/**
 * Metadata keys for storing decorator information
 */
export const WORKFLOW_IMPLEMENTATION_METADATA = "temporal-contract:workflow-implementation";
export const WORKFLOW_CONTRACT_METADATA = "temporal-contract:workflow-contract";

/**
 * Metadata interface for workflow implementations
 */
export interface WorkflowImplementationMetadata<
  TContract extends ContractDefinition = ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"] = keyof TContract["workflows"],
> {
  contract: TContract;
  workflowName: TWorkflowName;
  propertyKey: string;
}

/**
 * Decorator to mark a method as a workflow implementation
 *
 * Inspired by oRPC's @Implement decorator pattern for NestJS.
 * This decorator binds a contract workflow to a NestJS service method.
 *
 * Note: Unlike activities, workflows in Temporal must be defined in separate files
 * and cannot directly use NestJS dependency injection. This decorator is primarily
 * for organizing workflow definitions and can be used to generate workflow files
 * or for testing purposes.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class OrderWorkflowService {
 *   @ImplementWorkflow(myContract, 'processOrder')
 *   getProcessOrderImplementation(): WorkflowImplementation<typeof myContract, 'processOrder'> {
 *     return async (context, args) => {
 *       const payment = await context.activities.processPayment({
 *         customerId: args.customerId,
 *         amount: args.amount,
 *       });
 *
 *       return { orderId: args.orderId, status: 'completed' };
 *     };
 *   }
 * }
 * ```
 */
export function ImplementWorkflow<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"] & string,
>(contract: TContract, workflowName: TWorkflowName) {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<() => WorkflowImplementation<TContract, TWorkflowName>>,
  ) {
    // Store metadata about this workflow implementation
    const existingMetadata: WorkflowImplementationMetadata<TContract, TWorkflowName>[] =
      Reflect.getMetadata(WORKFLOW_IMPLEMENTATION_METADATA, target.constructor) || [];

    existingMetadata.push({
      contract,
      workflowName,
      propertyKey: String(propertyKey),
    });

    Reflect.defineMetadata(WORKFLOW_IMPLEMENTATION_METADATA, existingMetadata, target.constructor);

    // Store contract reference
    Reflect.defineMetadata(WORKFLOW_CONTRACT_METADATA, contract, target.constructor);
  };
}

/**
 * Get workflow implementations from a NestJS provider
 *
 * Extracts all methods decorated with @ImplementWorkflow from a provider instance
 * and returns them as a map of workflow names to implementations.
 *
 * @param provider - NestJS provider instance with decorated methods
 * @returns Map of workflow names to implementations
 */
export function extractWorkflowsFromProvider<TContract extends ContractDefinition>(
  provider: object,
): Record<string, WorkflowImplementation<TContract, keyof TContract["workflows"]>> {
  const constructor = provider.constructor;
  const metadata: WorkflowImplementationMetadata<TContract>[] =
    Reflect.getMetadata(WORKFLOW_IMPLEMENTATION_METADATA, constructor) || [];

  const implementations: Record<
    string,
    WorkflowImplementation<TContract, keyof TContract["workflows"]>
  > = {};

  for (const meta of metadata) {
    const method = (provider as Record<string, unknown>)[meta.propertyKey];

    if (typeof method === "function") {
      // Call the method to get the implementation
      const implementation = (
        method as () => WorkflowImplementation<TContract, typeof meta.workflowName>
      ).call(provider);
      implementations[String(meta.workflowName)] = implementation;
    }
  }

  return implementations;
}

/**
 * Get the contract from a provider class
 *
 * @param providerClass - Provider class with @ImplementWorkflow decorators
 * @returns Contract definition or undefined
 */
export function getWorkflowContractFromProvider<TContract extends ContractDefinition>(
  providerClass: new (...args: unknown[]) => unknown,
): TContract | undefined {
  return Reflect.getMetadata(WORKFLOW_CONTRACT_METADATA, providerClass);
}
