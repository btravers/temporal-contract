/**
 * Order Processing Contract Package
 *
 * This package contains the contract definition and domain schemas
 * for the order processing workflow.
 *
 * It can be:
 * - Imported by the worker to implement the workflow and activities
 * - Imported by the client (in another application) to consume the workflow
 */

export { orderProcessingContract } from "./contract.js";
export * from "./schemas.js";
