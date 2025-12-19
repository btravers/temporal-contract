import { ConfigurableModuleBuilder } from "@nestjs/common";
import { TemporalModuleOptions } from "./interfaces.js";

/**
 * Build the configurable module for Temporal integration
 * This uses NestJS's ConfigurableModuleBuilder to create forRoot/forRootAsync methods
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<TemporalModuleOptions>({
    moduleName: "Temporal",
    optionsInjectionToken: "TEMPORAL_MODULE_OPTIONS",
  })
    .setClassMethodName("forRoot")
    .setFactoryMethodName("createTemporalModuleOptions")
    .build();

/**
 * Export types for use in module definition
 */
export type TemporalModuleOptionsType = typeof OPTIONS_TYPE;
export type TemporalModuleAsyncOptionsType = typeof ASYNC_OPTIONS_TYPE;
