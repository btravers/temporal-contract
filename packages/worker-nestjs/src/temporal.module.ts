import { Module, Global } from "@nestjs/common";
import { ConfigurableModuleClass } from "./temporal.module-definition.js";
import { TemporalService } from "./temporal.service.js";

/**
 * Temporal module for NestJS integration
 *
 * Provides a declarative way to define Temporal workers with type-safe activities.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TemporalModule.forRoot({
 *       contract: myContract,
 *       activities: {
 *         // All activities must be implemented here
 *       },
 *       connection: nativeConnection,
 *       workflowsPath: require.resolve('./workflows'),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [TemporalService],
  exports: [TemporalService],
})
export class TemporalModule extends ConfigurableModuleClass {}
