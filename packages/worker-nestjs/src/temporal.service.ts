import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { Worker, NativeConnection } from "@temporalio/worker";
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
  private connection: NativeConnection | undefined;
  private shouldCloseConnection: boolean = false;

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
      this.worker.shutdown();
      this.worker = undefined;
    }

    if (this.connection && this.shouldCloseConnection) {
      this.logger.log("Closing Temporal connection...");
      await this.connection.close();
      this.connection = undefined;
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
    // Get or create connection
    if (this.options.connection instanceof NativeConnection) {
      this.connection = this.options.connection;
    } else {
      this.connection = await NativeConnection.connect(this.options.connection);
      this.shouldCloseConnection = true;
    }

    // Use declareActivitiesHandler to wrap activities with validation
    const activities = declareActivitiesHandler({
      contract: this.options.contract,
      activities: this.options.activities as never,
    });

    // Create the worker
    this.worker = await Worker.create({
      connection: this.connection,
      workflowsPath: this.options.workflowsPath,
      taskQueue: this.options.contract.taskQueue,
      activities,
      ...this.options.workerOptions,
    });
  }
}
