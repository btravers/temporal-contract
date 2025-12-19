import { Module, DynamicModule, Global } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { ConfigurableModuleClass } from "./temporal.module-definition.js";
import { TemporalService } from "./temporal.service.js";

/**
 * Temporal module for NestJS integration
 *
 * Provides a declarative way to define Temporal workers and activities using
 * NestJS modules and decorators.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TemporalModule.forRoot({
 *       contract: myContract,
 *       connection: { address: 'localhost:7233' },
 *       workflowsPath: require.resolve('./workflows'),
 *     }),
 *   ],
 *   providers: [MyActivitiesService],
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
      imports: [...(module.imports || []), DiscoveryModule],
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
      imports: [...(module.imports || []), DiscoveryModule],
      providers: [...(module.providers || []), TemporalService],
      exports: [TemporalService],
    };
  }
}
