import { Module, DynamicModule, Provider, Type } from "@nestjs/common";
import type { ContractDefinition } from "@temporal-contract/contract";
import {
  declareActivitiesHandler,
  ActivityImplementations,
} from "@temporal-contract/worker/activity";
import { extractActivitiesFromHandler, ACTIVITIES_HANDLER_METADATA } from "./activity-handler.js";

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
   * NestJS handler class that implements all activities using @ActivitiesHandler decorator
   * The handler should implement ActivityImplementations<TContract>
   */
  handler: Type<ActivityImplementations<TContract>>;

  /**
   * Optional additional providers needed by the handler
   */
  providers?: Type<unknown>[];
}

/**
 * Create a NestJS module for Temporal activities
 *
 * This function creates a dynamic NestJS module using the multi-handler approach
 * inspired by ts-rest for ultimate type safety. One handler class implements all
 * activities from the contract.
 *
 * @example
 * ```ts
 * // activities/order-activities.handler.ts
 * import { Injectable } from '@nestjs/common';
 * import { ActivitiesHandler } from '@temporal-contract/worker-nestjs/activity';
 * import { Future, Result } from '@temporal-contract/boxed';
 * import { ActivityError } from '@temporal-contract/worker/activity';
 * import type { ActivityImplementations } from '@temporal-contract/worker/activity';
 *
 * @Injectable()
 * @ActivitiesHandler(orderContract)
 * export class OrderActivitiesHandler implements ActivityImplementations<typeof orderContract> {
 *   constructor(
 *     private readonly paymentGateway: PaymentGateway,
 *     private readonly emailService: EmailService,
 *   ) {}
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
 *
 *   // ... implement all other activities
 * }
 *
 * // activities/activities.module.ts
 * import { createActivitiesModule } from '@temporal-contract/worker-nestjs/activity';
 * import { orderContract } from './contract';
 * import { OrderActivitiesHandler } from './order-activities.handler';
 * import { PaymentGateway } from './payment-gateway.service';
 * import { EmailService } from './email.service';
 *
 * export const ActivitiesModule = createActivitiesModule({
 *   contract: orderContract,
 *   handler: OrderActivitiesHandler,
 *   providers: [PaymentGateway, EmailService],
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
  const { contract, handler, providers = [] } = options;

  // Verify handler has the decorator
  const handlerContract = Reflect.getMetadata(ACTIVITIES_HANDLER_METADATA, handler);
  if (!handlerContract) {
    throw new Error(`Handler class must be decorated with @ActivitiesHandler decorator`);
  }

  // Create a factory provider that builds the activities handler
  const activitiesHandlerProvider: Provider = {
    provide: ACTIVITIES_HANDLER_TOKEN,
    useFactory: (handlerInstance: ActivityImplementations<TContract>) => {
      // Extract implementations from the handler
      const implementations = extractActivitiesFromHandler<TContract>(handlerInstance);

      // Create the activities handler
      return declareActivitiesHandler({
        contract,
        activities: implementations,
      });
    },
    inject: [handler],
  };

  @Module({
    providers: [...providers, handler, activitiesHandlerProvider],
    exports: [ACTIVITIES_HANDLER_TOKEN],
  })
  class ActivitiesModuleClass {}

  return {
    module: ActivitiesModuleClass,
    providers: [...providers, handler, activitiesHandlerProvider],
    exports: [ACTIVITIES_HANDLER_TOKEN],
  };
}
