import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { Worker, NativeConnection } from "@temporalio/worker";
import { ContractDefinition } from "@temporal-contract/contract";
import { declareActivitiesHandler, ActivitiesHandler } from "@temporal-contract/worker/activity";
import { TEMPORAL_MODULE_OPTIONS } from "./constants.js";
import type { TemporalModuleOptions } from "./interfaces.js";
import { getActivityHandlers } from "./decorators.js";

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
    @Inject(TEMPORAL_MODULE_OPTIONS)
    private readonly options: TemporalModuleOptions,
    private readonly discoveryService: DiscoveryService,
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
   * Initialize the Temporal worker with discovered activities
   */
  private async initializeWorker(): Promise<void> {
    // Get or create connection
    if (this.options.connection instanceof NativeConnection) {
      this.connection = this.options.connection;
    } else {
      this.connection = await NativeConnection.connect(this.options.connection);
      this.shouldCloseConnection = true;
    }

    // Discover and build activities from providers
    const activities = await this.discoverActivities();

    // Create the worker
    this.worker = await Worker.create({
      connection: this.connection,
      workflowsPath: this.options.workflowsPath,
      taskQueue: this.options.contract.taskQueue,
      activities,
      ...this.options.workerOptions,
    });
  }

  /**
   * Discover activities from NestJS providers and build activity handler
   */
  private async discoverActivities(): Promise<ActivitiesHandler<ContractDefinition>> {
    const providers = this.discoveryService.getProviders();
    const activityHandlers: Record<string, Record<string, unknown>> = {};

    // Scan all providers for activity handlers
    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== "object") {
        continue;
      }

      const handlers = getActivityHandlers(instance);
      if (handlers.length === 0) {
        continue;
      }

      this.logger.debug(
        `Found ${handlers.length} activity handlers in ${instance.constructor.name}`,
      );

      // Process each handler
      for (const handler of handlers) {
        const { workflowName, activityName, methodName } = handler;

        // Initialize workflow namespace if needed
        if (!activityHandlers[workflowName]) {
          activityHandlers[workflowName] = {};
        }

        // Get the method from the instance
        const method = (instance as Record<string | symbol, unknown>)[methodName];
        if (typeof method !== "function") {
          this.logger.warn(
            `Activity handler ${workflowName}.${activityName} method ${String(methodName)} is not a function`,
          );
          continue;
        }

        // Bind the method to the instance to preserve 'this' context
        activityHandlers[workflowName][activityName] = method.bind(instance);

        this.logger.debug(`Registered activity: ${workflowName}.${activityName}`);
      }
    }

    // Convert to format expected by declareActivitiesHandler
    const activitiesImplementation = this.buildActivitiesImplementation(activityHandlers);

    // Use declareActivitiesHandler to wrap with validation
    return declareActivitiesHandler({
      contract: this.options.contract,
      activities: activitiesImplementation as never,
    });
  }

  /**
   * Build activities implementation in the format expected by declareActivitiesHandler
   */
  private buildActivitiesImplementation(
    handlers: Record<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [workflowName, activities] of Object.entries(handlers)) {
      // Check if this workflow exists in the contract
      const workflowDef = (this.options.contract.workflows as Record<string, unknown>)?.[
        workflowName
      ];

      if (!workflowDef) {
        this.logger.warn(`Workflow "${workflowName}" not found in contract, skipping activities`);
        continue;
      }

      // Add workflow activities under workflow namespace
      if (!result[workflowName]) {
        result[workflowName] = {};
      }

      for (const [activityName, handler] of Object.entries(activities)) {
        (result[workflowName] as Record<string, unknown>)[activityName] = handler;
      }
    }

    return result;
  }
}
