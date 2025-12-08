import { proxyActivities, workflowInfo } from '@temporalio/workflow';
/**
 * Create a validated activities proxy that parses inputs and outputs
 *
 * This wrapper ensures data integrity across the network boundary between
 * workflow and activity execution.
 */
function createValidatedActivities(rawActivities, workflowActivitiesDefinition, contractActivitiesDefinition) {
    const validatedActivities = {};
    // Merge workflow activities and global contract activities
    const allActivitiesDefinition = {
        ...contractActivitiesDefinition,
        ...workflowActivitiesDefinition, // Workflow activities override global ones
    };
    for (const [activityName, activityDef] of Object.entries(allActivitiesDefinition)) {
        const rawActivity = rawActivities[activityName];
        validatedActivities[activityName] = async (...args) => {
            // Validate input before sending over network
            const validatedInput = activityDef.input.parse(args);
            // Call the actual activity
            const result = await rawActivity(...validatedInput);
            // Validate output after receiving from network
            return activityDef.output.parse(result);
        };
    }
    return validatedActivities;
}
/**
 * Create a typed activities handler with automatic validation
 *
 * This wraps all activity implementations with Zod validation at network boundaries.
 * TypeScript ensures ALL activities (global + workflow-specific) are implemented.
 *
 * Use this to create the activities object for the Temporal Worker.
 *
 * @example
 * ```ts
 * import { createActivitiesHandler } from '@temporal-contract/worker';
 * import myContract from './contract';
 *
 * export const activitiesHandler = createActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Global activities
 *     sendEmail: async (to, subject, body) => {
 *       await emailService.send({ to, subject, body });
 *       return { sent: true };
 *     },
 *     // Workflow-specific activities
 *     validateInventory: async (orderId) => {
 *       const available = await inventory.check(orderId);
 *       return { available };
 *     },
 *   },
 * });
 *
 * // Use with Temporal Worker
 * import { Worker } from '@temporalio/worker';
 *
 * const worker = await Worker.create({
 *   workflowsPath: require.resolve('./workflows'),
 *   activities: activitiesHandler.activities,
 *   taskQueue: activitiesHandler.contract.taskQueue,
 * });
 * ```
 */
export function createActivitiesHandler(options) {
    const { contract, activities } = options;
    // Wrap activities with validation
    const wrappedActivities = {};
    for (const [activityName, activityImpl] of Object.entries(activities)) {
        // Find activity definition (global or workflow-specific)
        let activityDef;
        // Check global activities
        if (contract.activities?.[activityName]) {
            activityDef = contract.activities[activityName];
        }
        else {
            // Check workflow-specific activities
            for (const workflow of Object.values(contract.workflows)) {
                if (workflow.activities?.[activityName]) {
                    activityDef = workflow.activities[activityName];
                    break;
                }
            }
        }
        if (!activityDef) {
            throw new Error(`Activity definition not found for: ${activityName}`);
        }
        wrappedActivities[activityName] = async (...args) => {
            // Validate input
            const validatedInput = activityDef.input.parse(args);
            // Execute activity
            const result = await activityImpl(...validatedInput);
            // Validate output
            return activityDef.output.parse(result);
        };
    }
    return {
        contract,
        activities: wrappedActivities,
    };
}
/**
 * Create a typed workflow implementation with automatic validation
 *
 * This wraps a workflow implementation with:
 * - Input/output validation
 * - Typed workflow context with activities
 * - Workflow info access
 *
 * Workflows must be defined in separate files and imported by the Temporal Worker
 * via workflowsPath.
 *
 * @example
 * ```ts
 * // workflows/processOrder.ts
 * import { createWorkflow } from '@temporal-contract/worker';
 * import myContract from '../contract';
 *
 * export const processOrder = createWorkflow({
 *   definition: myContract.workflows.processOrder,
 *   contract: myContract,
 *   implementation: async (context, orderId, customerId) => {
 *     // context.activities: typed activities (workflow + global)
 *     // context.info: WorkflowInfo
 *
 *     const inventory = await context.activities.validateInventory(orderId);
 *
 *     if (!inventory.available) {
 *       throw new Error('Out of stock');
 *     }
 *
 *     const payment = await context.activities.chargePayment(customerId, 100);
 *
 *     // Global activity
 *     await context.activities.sendEmail(
 *       customerId,
 *       'Order processed',
 *       'Your order has been processed'
 *     );
 *
 *     return {
 *       orderId,
 *       status: payment.success ? 'success' : 'failed',
 *       transactionId: payment.transactionId,
 *     };
 *   },
 *   activityOptions: {
 *     startToCloseTimeout: '1 minute',
 *   },
 * });
 * ```
 *
 * Then in your worker setup:
 * ```ts
 * // worker.ts
 * import { Worker } from '@temporalio/worker';
 * import { activitiesHandler } from './activities';
 *
 * const worker = await Worker.create({
 *   workflowsPath: require.resolve('./workflows'), // Imports processOrder
 *   activities: activitiesHandler.activities,
 *   taskQueue: activitiesHandler.contract.taskQueue,
 * });
 * ```
 */
export function createWorkflow(options) {
    const { definition, contract, implementation, activityOptions } = options;
    return async (...args) => {
        // Validate workflow input
        const validatedInput = definition.input.parse(args);
        // Create activities proxy if activities are defined
        let contextActivities = {};
        if (definition.activities || contract.activities) {
            const rawActivities = proxyActivities({
                startToCloseTimeout: 60_000, // 1 minute default
                ...activityOptions,
            });
            contextActivities = createValidatedActivities(rawActivities, definition.activities, contract.activities);
        }
        // Create workflow context
        const context = {
            activities: contextActivities,
            info: workflowInfo(),
        };
        // Execute workflow
        const result = await implementation(context, ...validatedInput);
        // Validate workflow output
        return definition.output.parse(result);
    };
}
