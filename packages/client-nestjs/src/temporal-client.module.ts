import { Module, Global } from "@nestjs/common";
import { ConfigurableModuleClass } from "./temporal-client.module-definition.js";
import { TemporalClientService } from "./temporal-client.service.js";

/**
 * Temporal client module for NestJS integration
 *
 * Provides a declarative way to define Temporal clients with type safety.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TemporalClientModule.forRoot({
 *       contract: myContract,
 *       client: temporalClient,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [TemporalClientService],
  exports: [TemporalClientService],
})
export class TemporalClientModule extends ConfigurableModuleClass {}
