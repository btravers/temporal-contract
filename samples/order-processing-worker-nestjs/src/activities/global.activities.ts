import { Injectable } from "@nestjs/common";
import { TemporalActivity } from "@temporal-contract/worker-nestjs";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { NotificationService } from "../domain/notification.service.js";
import { LoggerService } from "../domain/logger.service.js";

/**
 * Global activities (not specific to any workflow)
 * These can be used by any workflow in the contract
 */
@Injectable()
export class GlobalActivitiesService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Send a notification to a customer
   * This is a global activity available to all workflows
   */
  @TemporalActivity("processOrder", "sendNotification")
  async sendNotification(args: {
    customerId: string;
    subject: string;
    message: string;
  }): Promise<Future<Result<void, ActivityError>>> {
    return Future.make(async (resolve) => {
      try {
        await this.notificationService.send(args.customerId, args.subject, args.message);
        resolve(Result.Ok(undefined));
      } catch (error) {
        resolve(
          Result.Error(
            new ActivityError(
              "NOTIFICATION_FAILED",
              error instanceof Error ? error.message : "Failed to send notification",
              error,
            ),
          ),
        );
      }
    });
  }

  /**
   * Log a message
   * This is a global activity for logging
   */
  @TemporalActivity("processOrder", "log")
  async log(args: {
    level: "info" | "warn" | "error";
    message: string;
  }): Promise<Future<Result<void, ActivityError>>> {
    return Future.make(async (resolve) => {
      this.loggerService.log(args.level, args.message);
      resolve(Result.Ok(undefined));
    });
  }
}
