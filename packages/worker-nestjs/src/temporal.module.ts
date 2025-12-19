import { Module, DynamicModule, Global } from "@nestjs/common";
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
 *       connection: { address: 'localhost:7233' },
 *       workflowsPath: require.resolve('./workflows'),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class TemporalModule extends ConfigurableModuleClass {
  static override forRoot(
    options: Parameters<typeof ConfigurableModuleClass.forRoot>[0],
  ): DynamicModule {
    const module = super.forRoot(options);

    return {
      ...module,
      providers: [...(module.providers || []), TemporalService],
      exports: [TemporalService],
    };
  }

  static override forRootAsync(
    options: Parameters<typeof ConfigurableModuleClass.forRootAsync>[0],
  ): DynamicModule {
    const module = super.forRootAsync(options);

    return {
      ...module,
      providers: [...(module.providers || []), TemporalService],
      exports: [TemporalService],
    };
  }
}
