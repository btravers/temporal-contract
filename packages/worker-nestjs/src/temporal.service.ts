import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { Worker } from "@temporalio/worker";
import { MODULE_OPTIONS_TOKEN } from "./temporal.module-definition.js";
import type { TemporalModuleOptions } from "./interfaces.js";

/**
 * Service managing the Temporal worker lifecycle and activity registration
 */
@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalService.name);

  private worker: Worker | undefined;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: TemporalModuleOptions,
  ) {}

  /**
   * Initialize the worker on module initialization
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Temporal worker...");
    await this.initializeWorker();
    this.logger.log("Temporal worker initialized");
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  /**
   * Get the worker instance
   * @throws {Error} If the worker is not initialized
   */
  getWorker(): Worker {
    if (!this.worker) {
      throw new Error("Worker not initialized");
    }
    return this.worker;
  }

  /**
   * Stop the Temporal worker
   */
  private async stop(): Promise<void> {
    if (this.worker) {
      this.logger.log("Shutting down Temporal worker...");
      await this.worker.shutdown();
      this.worker = undefined;
      this.logger.log("Temporal worker shut down");
    }
  }

  /**
   * Initialize the Temporal worker with provided activities and start it
   */
  private async initializeWorker(): Promise<void> {
    // Create the worker - activities are already properly typed and validated
    this.worker = await Worker.create({
      ...this.options,
      connection: this.options.connection,
      workflowsPath: this.options.workflowsPath,
      taskQueue: this.options.contract.taskQueue,
      activities: this.options.activities,
    });

    // Start the worker in the background
    this.logger.log(`Starting Temporal worker on task queue: ${this.options.contract.taskQueue}`);
    this.worker.run().catch((error) => {
      this.logger.error(`Temporal worker encountered an error: ${error.message}`, error.stack);
    });
  }
}
