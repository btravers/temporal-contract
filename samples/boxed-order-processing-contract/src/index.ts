/**
 * Boxed Order Processing Contract Package
 *
 * This package contains the contract definition and domain schemas
 * for the boxed order processing workflow (using Result/Future pattern).
 *
 * It can be:
 * - Imported by the worker to implement the workflow and activities
 * - Imported by the client (in another application) to consume the workflow
 */

export { boxedOrderContract } from "./contract.js";
export * from "./schemas.js";
