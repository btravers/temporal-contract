import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { Worker } from "@temporalio/worker";
import { declareActivitiesHandler } from "@temporal-contract/worker/activity";
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
   * Start the Temporal worker
   */
  async start(): Promise<void> {
    if (!this.worker) {
      throw new Error("Worker not initialized. Call initializeWorker first.");
    }

    this.logger.log(`Starting Temporal worker on task queue: ${this.options.contract.taskQueue}`);
    await this.worker.run();
  }

  /**
   * Stop the Temporal worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      this.logger.log("Shutting down Temporal worker...");
      await this.worker.shutdown();
      this.worker = undefined;
      this.logger.log("Temporal worker shut down");
    }
  }

  /**
   * Get the worker instance
   */
  getWorker(): Worker | undefined {
    return this.worker;
  }

  /**
   * Initialize the Temporal worker with provided activities
   */
  private async initializeWorker(): Promise<void> {
    // Use declareActivitiesHandler to wrap activities with validation
    const activities = declareActivitiesHandler({
      contract: this.options.contract,
      activities: this.options.activities as never,
    });

    // Create the worker
    this.worker = await Worker.create({
      connection: this.options.connection,
      workflowsPath: this.options.workflowsPath,
      taskQueue: this.options.contract.taskQueue,
      activities,
      ...this.options,
    });
  }
}
