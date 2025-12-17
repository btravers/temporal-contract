import "reflect-metadata";
import type { ContractDefinition } from "@temporal-contract/contract";
import type { ActivityImplementations } from "@temporal-contract/worker/activity";

/**
 * Metadata key for storing contract activities handler
 */
export const ACTIVITIES_HANDLER_METADATA = "temporal-contract:activities-handler";

/**
 * Decorator to mark a class as an activities handler for a contract
 *
 * Inspired by ts-rest's multi-handler approach for ultimate type safety.
 * The decorated class should implement all activities from the contract.
 *
 * @example
 * ```ts
 * @Injectable()
 * @ActivitiesHandler(orderContract)
 * export class OrderActivitiesHandler implements ActivityImplementations<typeof orderContract> {
 *   constructor(private readonly paymentGateway: PaymentGateway) {}
 *
 *   log(args: { level: string; message: string }) {
 *     logger[args.level](args.message);
 *     return Future.value(Result.Ok(undefined));
 *   }
 *
 *   sendNotification(args: { customerId: string; subject: string; message: string }) {
 *     return Future.fromPromise(
 *       this.emailService.send(args)
 *     ).mapError(error => new ActivityError('NOTIFICATION_FAILED', error.message, error));
 *   }
 *
 *   processPayment(args: { customerId: string; amount: number }) {
 *     return Future.fromPromise(
 *       this.paymentGateway.charge(args)
 *     ).mapError(error => new ActivityError('PAYMENT_FAILED', error.message, error));
 *   }
 * }
 * ```
 */
export function ActivitiesHandler<TContract extends ContractDefinition>(contract: TContract) {
  return function (target: new (...args: unknown[]) => unknown) {
    Reflect.defineMetadata(ACTIVITIES_HANDLER_METADATA, contract, target);
  };
}

/**
 * Get the contract from an activities handler class
 *
 * @param handlerClass - Handler class with @ActivitiesHandler decorator
 * @returns Contract definition or undefined
 */
export function getContractFromHandler<TContract extends ContractDefinition>(
  handlerClass: new (...args: unknown[]) => unknown,
): TContract | undefined {
  return Reflect.getMetadata(ACTIVITIES_HANDLER_METADATA, handlerClass);
}

/**
 * Extract activity implementations from a handler instance
 *
 * @param handler - Handler instance implementing all activities
 * @returns Activity implementations object
 */
export function extractActivitiesFromHandler<TContract extends ContractDefinition>(
  handler: object,
): ActivityImplementations<TContract> {
  // The handler instance itself contains all the activity methods
  // We bind each method to preserve 'this' context
  const implementations: Record<string, unknown> = {};

  // Get all property names from the handler's prototype chain
  const proto = Object.getPrototypeOf(handler);
  const propertyNames = Object.getOwnPropertyNames(proto);

  for (const propertyName of propertyNames) {
    // Skip constructor and private methods
    if (propertyName === "constructor" || propertyName.startsWith("_")) {
      continue;
    }

    const method = (handler as Record<string, unknown>)[propertyName];

    if (typeof method === "function") {
      implementations[propertyName] = method.bind(handler);
    }
  }

  return implementations as ActivityImplementations<TContract>;
}
