/**
 * Contract Re-export
 *
 * Import and re-export the contract from the dedicated contract package.
 * The contract package is shared between the worker and client applications.
 */

export { boxedOrderContract } from "@temporal-contract/sample-boxed-order-processing-contract";
export type { Order, OrderResult } from "@temporal-contract/sample-boxed-order-processing-contract";
