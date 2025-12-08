/**
 * Builder for creating activity definitions
 *
 * @example
 * ```ts
 * const myActivity = activity({
 *   input: z.tuple([z.object({ name: z.string() })]),
 *   output: z.object({ greeting: z.string() }),
 * });
 * ```
 */
export const activity = (config) => {
    return {
        input: config.input,
        output: config.output,
    };
};
/**
 * Builder for creating workflow definitions
 *
 * @example
 * ```ts
 * const myWorkflow = workflow({
 *   input: z.tuple([z.object({ orderId: z.string() })]),
 *   output: z.object({ status: z.string() }),
 *   activities: {
 *     processPayment: activity({
 *       input: z.tuple([z.object({ amount: z.number() })]),
 *       output: z.object({ success: z.boolean() }),
 *     }),
 *   },
 * });
 * ```
 */
export const workflow = (config) => {
    return {
        input: config.input,
        output: config.output,
        activities: config.activities,
    };
};
/**
 * Builder for creating a complete contract
 *
 * @example
 * ```ts
 * const myContract = contract({
 *   taskQueue: 'my-service',
 *   workflows: {
 *     processOrder: workflow({ ... }),
 *     sendNotification: workflow({ ... }),
 *   },
 *   activities: {
 *     sendEmail: activity({ ... }),
 *   },
 * });
 * ```
 */
export const contract = (definition) => {
    return definition;
};
