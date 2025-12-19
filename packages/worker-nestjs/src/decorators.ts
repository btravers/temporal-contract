import "reflect-metadata";
import { TEMPORAL_ACTIVITY_METADATA } from "./constants.js";
import type { ActivityHandlerMetadata } from "./interfaces.js";

/**
 * Decorator to mark a method as a Temporal activity handler
 *
 * @param workflowName - Name of the workflow this activity belongs to
 * @param activityName - Name of the activity
 *
 * @example
 * ```ts
 * @Injectable()
 * class OrderActivitiesService {
 *   @TemporalActivity('processOrder', 'validateOrder')
 *   async validateOrder(input: { orderId: string }) {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function TemporalActivity(workflowName: string, activityName: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingMetadata: ActivityHandlerMetadata[] =
      Reflect.getMetadata(TEMPORAL_ACTIVITY_METADATA, target.constructor) || [];

    const metadata: ActivityHandlerMetadata = {
      workflowName,
      activityName,
    };

    Reflect.defineMetadata(
      TEMPORAL_ACTIVITY_METADATA,
      [...existingMetadata, { ...metadata, methodName: propertyKey }],
      target.constructor,
    );

    return descriptor;
  };
}

/**
 * Get all activity handler metadata from a class
 */
export function getActivityHandlers(
  target: object,
): Array<ActivityHandlerMetadata & { methodName: string | symbol }> {
  return Reflect.getMetadata(TEMPORAL_ACTIVITY_METADATA, target.constructor) || [];
}
