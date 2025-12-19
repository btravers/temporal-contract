import { Module } from "@nestjs/common";
import { TemporalModule } from "@temporal-contract/worker-nestjs";
import { NativeConnection } from "@temporalio/worker";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { DependenciesModule } from "./dependencies.module.js";
import { ActivitiesProvider } from "./activities.provider.js";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}

/**
 * Main application module that sets up the Temporal NestJS worker
 *
 * This module:
 * - Imports DependenciesModule to provide all domain and infrastructure services
 * - Provides ActivitiesProvider to create type-safe activities
 * - Configures TemporalModule with the contract and activities
 */
@Module({
  imports: [
    DependenciesModule,
    TemporalModule.forRootAsync({
      inject: [ActivitiesProvider],
      useFactory: async (activitiesProvider: ActivitiesProvider) => {
        // Create connection to Temporal server
        // Note: This is hardcoded for the sample. In production, use environment variables
        const connection = await NativeConnection.connect({
          address: "localhost:7233",
        });

        return {
          contract: orderProcessingContract,
          connection,
          namespace: "default",
          workflowsPath: workflowPath("workflows"),
          activities: activitiesProvider.createActivities(),
        };
      },
    }),
  ],
  providers: [ActivitiesProvider],
})
export class AppModule {}
