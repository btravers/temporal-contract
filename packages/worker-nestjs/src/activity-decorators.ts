import "reflect-metadata";
import type { ContractDefinition, ActivityDefinition } from "@temporal-contract/contract";
import type {
  ActivityImplementations,
  BoxedActivityImplementation,
} from "@temporal-contract/worker/activity";

/**
 * Metadata keys for storing decorator information
 */
export const ACTIVITY_IMPLEMENTATION_METADATA = "temporal-contract:activity-implementation";
export const ACTIVITY_CONTRACT_METADATA = "temporal-contract:activity-contract";

/**
 * Metadata interface for activity implementations
 */
export interface ActivityImplementationMetadata<
  TContract extends ContractDefinition = ContractDefinition,
> {
  contract: TContract;
  activityName: string;
  propertyKey: string;
}

/**
 * Decorator to mark a method as an activity implementation
 *
 * Inspired by oRPC's @Implement decorator pattern for NestJS.
 * This decorator binds a contract activity to a NestJS service method.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class PaymentService {
 *   constructor(private readonly paymentGateway: PaymentGateway) {}
 *
 *   @ImplementActivity(myContract, 'processPayment')
 *   async processPayment(args: { customerId: string; amount: number }) {
 *     return Future.fromPromise(
 *       this.paymentGateway.charge(args.customerId, args.amount)
 *     ).mapError(error => new ActivityError('PAYMENT_FAILED', error.message, error));
 *   }
 * }
 * ```
 */
export function ImplementActivity<
  TContract extends ContractDefinition,
  TActivityName extends keyof (TContract["activities"] extends Record<string, ActivityDefinition>
    ? TContract["activities"]
    : {}) &
    string,
>(contract: TContract, activityName: TActivityName) {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<BoxedActivityImplementation<ActivityDefinition>>,
  ) {
    // Store metadata about this activity implementation
    const existingMetadata: ActivityImplementationMetadata<TContract>[] =
      Reflect.getMetadata(ACTIVITY_IMPLEMENTATION_METADATA, target.constructor) || [];

    existingMetadata.push({
      contract,
      activityName: activityName as string,
      propertyKey: String(propertyKey),
    });

    Reflect.defineMetadata(ACTIVITY_IMPLEMENTATION_METADATA, existingMetadata, target.constructor);

    // Store contract reference
    Reflect.defineMetadata(ACTIVITY_CONTRACT_METADATA, contract, target.constructor);
  };
}

/**
 * Get activity implementations from a NestJS provider
 *
 * Extracts all methods decorated with @ImplementActivity from a provider instance
 * and returns them as an ActivityImplementations object ready for declareActivitiesHandler.
 *
 * @param provider - NestJS provider instance with decorated methods
 * @returns Partial activity implementations map
 */
export function extractActivitiesFromProvider<TContract extends ContractDefinition>(
  provider: object,
): Partial<ActivityImplementations<TContract>> {
  const constructor = provider.constructor;
  const metadata: ActivityImplementationMetadata<TContract>[] =
    Reflect.getMetadata(ACTIVITY_IMPLEMENTATION_METADATA, constructor) || [];

  const implementations: Partial<ActivityImplementations<TContract>> = {};

  for (const meta of metadata) {
    const method = (provider as Record<string, unknown>)[meta.propertyKey];

    if (typeof method === "function") {
      // Bind the method to preserve 'this' context
      (implementations as Record<string, unknown>)[meta.activityName] = method.bind(provider);
    }
  }

  return implementations;
}

/**
 * Get the contract from a provider class
 *
 * @param providerClass - Provider class with @ImplementActivity decorators
 * @returns Contract definition or undefined
 */
export function getContractFromProvider<TContract extends ContractDefinition>(
  providerClass: new (...args: unknown[]) => unknown,
): TContract | undefined {
  return Reflect.getMetadata(ACTIVITY_CONTRACT_METADATA, providerClass);
}
