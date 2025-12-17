import { Module, DynamicModule, Provider, Type } from "@nestjs/common";
import type { ContractDefinition } from "@temporal-contract/contract";
import {
  declareActivitiesHandler,
  ActivityImplementations,
} from "@temporal-contract/worker/activity";
import {
  extractActivitiesFromProvider,
  ACTIVITY_IMPLEMENTATION_METADATA,
  ActivityImplementationMetadata,
} from "./activity-decorators.js";

/**
 * Token for injecting the activities handler
 */
export const ACTIVITIES_HANDLER_TOKEN = "TEMPORAL_CONTRACT_ACTIVITIES_HANDLER";

/**
 * Options for creating an activities module
 */
export interface ActivitiesModuleOptions<TContract extends ContractDefinition> {
  /**
   * Contract definition
   */
  contract: TContract;

  /**
   * NestJS providers that implement activities using @ImplementActivity decorator
   * These providers will be scanned for decorated methods
   */
  providers: Type<unknown>[];

  /**
   * Optional additional activity implementations not from providers
   * These will be merged with implementations extracted from providers
   */
  additionalActivities?: Partial<ActivityImplementations<TContract>>;
}

/**
 * Create a NestJS module for Temporal activities
 *
 * This function creates a dynamic NestJS module that:
 * 1. Registers activity providers with dependency injection
 * 2. Extracts activity implementations from @ImplementActivity decorated methods
 * 3. Creates an activities handler ready for Temporal Worker
 * 4. Exports the handler for use in worker setup
 *
 * Inspired by oRPC's NestJS integration pattern with @Implement decorator.
 *
 * @example
 * ```ts
 * // activities/payment.service.ts
 * import { Injectable } from '@nestjs/common';
 * import { ImplementActivity } from '@temporal-contract/worker-nestjs/activity';
 * import { Future, Result } from '@temporal-contract/boxed';
 * import { ActivityError } from '@temporal-contract/worker/activity';
 *
 * @Injectable()
 * export class PaymentService {
 *   constructor(private paymentGateway: PaymentGateway) {}
 *
 *   @ImplementActivity(orderContract, 'processPayment')
 *   processPayment(args: { customerId: string; amount: number }) {
 *     return Future.fromPromise(
 *       this.paymentGateway.charge(args)
 *     ).mapError(
 *       error => new ActivityError('PAYMENT_FAILED', error.message, error)
 *     );
 *   }
 * }
 *
 * // activities/activities.module.ts
 * import { createActivitiesModule } from '@temporal-contract/worker-nestjs/activity';
 * import { orderContract } from './contract';
 * import { PaymentService } from './payment.service';
 * import { InventoryService } from './inventory.service';
 *
 * export const ActivitiesModule = createActivitiesModule({
 *   contract: orderContract,
 *   providers: [PaymentService, InventoryService],
 * });
 *
 * // app.module.ts
 * import { Module } from '@nestjs/common';
 * import { ActivitiesModule } from './activities/activities.module';
 *
 * @Module({
 *   imports: [ActivitiesModule],
 * })
 * export class AppModule {}
 *
 * // worker.ts
 * import { NestFactory } from '@nestjs/core';
 * import { Worker } from '@temporalio/worker';
 * import { AppModule } from './app.module';
 * import { ACTIVITIES_HANDLER_TOKEN } from '@temporal-contract/worker-nestjs/activity';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.createApplicationContext(AppModule);
 *   const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);
 *
 *   const worker = await Worker.create({
 *     workflowsPath: require.resolve('./workflows'),
 *     activities: activitiesHandler.activities,
 *     taskQueue: activitiesHandler.contract.taskQueue,
 *   });
 *
 *   await worker.run();
 * }
 * ```
 */
export function createActivitiesModule<TContract extends ContractDefinition>(
  options: ActivitiesModuleOptions<TContract>,
): DynamicModule {
  const { contract, providers, additionalActivities = {} } = options;

  // Filter providers to only those with activity decorators
  const activityProviders = providers.filter((provider) => {
    const metadata: ActivityImplementationMetadata<TContract>[] =
      Reflect.getMetadata(ACTIVITY_IMPLEMENTATION_METADATA, provider) || [];
    return metadata.length > 0;
  });

  // Create a factory provider that builds the activities handler
  const activitiesHandlerProvider: Provider = {
    provide: ACTIVITIES_HANDLER_TOKEN,
    useFactory: (...providerInstances: object[]) => {
      // Extract implementations from all providers
      const extractedImplementations: Partial<ActivityImplementations<TContract>> = {};

      for (const providerInstance of providerInstances) {
        const implementations = extractActivitiesFromProvider<TContract>(providerInstance);
        Object.assign(extractedImplementations, implementations);
      }

      // Merge with additional activities
      const allActivities = {
        ...extractedImplementations,
        ...additionalActivities,
      } as ActivityImplementations<TContract>;

      // Create the activities handler
      return declareActivitiesHandler({
        contract,
        activities: allActivities,
      });
    },
    inject: activityProviders,
  };

  @Module({
    providers: [...providers, activitiesHandlerProvider],
    exports: [ACTIVITIES_HANDLER_TOKEN],
  })
  class ActivitiesModuleClass {}

  return {
    module: ActivitiesModuleClass,
    providers: [...providers, activitiesHandlerProvider],
    exports: [ACTIVITIES_HANDLER_TOKEN],
  };
}
