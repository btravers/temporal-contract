import { ConfigurableModuleBuilder } from "@nestjs/common";
import { TemporalClientModuleOptions } from "./interfaces.js";

/**
 * Build the configurable module for Temporal client integration
 * This uses NestJS's ConfigurableModuleBuilder to create forRoot/forRootAsync methods
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<TemporalClientModuleOptions>({
    moduleName: "TemporalClient",
    optionsInjectionToken: "TEMPORAL_CLIENT_MODULE_OPTIONS",
  })
    .setClassMethodName("forRoot")
    .setFactoryMethodName("createTemporalClientModuleOptions")
    .build();
