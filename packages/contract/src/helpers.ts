import type { ContractDefinition, ActivityDefinition } from "./types.js";

/**
 * Extract all activity names from a contract, including both global and workflow-specific activities.
 *
 * @param contract - The contract definition
 * @returns Array of unique activity names
 *
 * @example
 * ```typescript
 * const activityNames = getAllActivityNames(myContract);
 * // ['sendEmail', 'chargePayment', 'logEvent']
 * ```
 */
export function getAllActivityNames(contract: ContractDefinition): string[] {
  const activityNames = new Set<string>();

  // Add global activities
  if (contract.activities) {
    for (const name of Object.keys(contract.activities)) {
      activityNames.add(name);
    }
  }

  // Add workflow-specific activities
  for (const workflow of Object.values(contract.workflows)) {
    if (workflow.activities) {
      for (const name of Object.keys(workflow.activities)) {
        activityNames.add(name);
      }
    }
  }

  return Array.from(activityNames).sort();
}

/**
 * Get all activities accessible from a specific workflow.
 * This includes both workflow-specific activities and global activities.
 *
 * @param contract - The contract definition
 * @param workflowName - Name of the workflow
 * @returns Record of activity definitions accessible from the workflow
 *
 * @example
 * ```typescript
 * const activities = getWorkflowActivities(myContract, 'processOrder');
 * // Returns both workflow-specific and global activities
 * ```
 */
export function getWorkflowActivities(
  contract: ContractDefinition,
  workflowName: string,
): Record<string, ActivityDefinition> {
  const workflow = contract.workflows[workflowName];
  if (!workflow) {
    throw new Error(`Workflow "${workflowName}" not found in contract`);
  }

  const activities: Record<string, ActivityDefinition> = {};

  // Add global activities first
  if (contract.activities) {
    Object.assign(activities, contract.activities);
  }

  // Add workflow-specific activities (they override global ones)
  if (workflow.activities) {
    Object.assign(activities, workflow.activities);
  }

  return activities;
}

/**
 * Check if a contract has a specific workflow.
 *
 * @param contract - The contract definition
 * @param workflowName - Name of the workflow to check
 * @returns True if the workflow exists in the contract
 *
 * @example
 * ```typescript
 * if (hasWorkflow(myContract, 'processOrder')) {
 *   // Workflow exists
 * }
 * ```
 */
export function hasWorkflow(contract: ContractDefinition, workflowName: string): boolean {
  return workflowName in contract.workflows;
}

/**
 * Check if a contract has a specific global activity.
 *
 * @param contract - The contract definition
 * @param activityName - Name of the activity to check
 * @returns True if the global activity exists in the contract
 *
 * @example
 * ```typescript
 * if (hasGlobalActivity(myContract, 'logEvent')) {
 *   // Global activity exists
 * }
 * ```
 */
export function hasGlobalActivity(contract: ContractDefinition, activityName: string): boolean {
  return Boolean(contract.activities && activityName in contract.activities);
}

/**
 * Get workflow names from a contract as a typed array.
 *
 * @param contract - The contract definition
 * @returns Array of workflow names
 *
 * @example
 * ```typescript
 * const workflows = getWorkflowNames(myContract);
 * // ['processOrder', 'sendNotification']
 * ```
 */
export function getWorkflowNames(contract: ContractDefinition): string[] {
  return Object.keys(contract.workflows).sort();
}

/**
 * Get statistics about a contract.
 *
 * @param contract - The contract definition
 * @returns Object containing contract statistics
 *
 * @example
 * ```typescript
 * const stats = getContractStats(myContract);
 * // {
 * //   workflowCount: 2,
 * //   globalActivityCount: 1,
 * //   totalActivityCount: 5,
 * //   signalCount: 3,
 * //   queryCount: 2,
 * //   updateCount: 1,
 * // }
 * ```
 */
export function getContractStats(contract: ContractDefinition): {
  workflowCount: number;
  globalActivityCount: number;
  totalActivityCount: number;
  signalCount: number;
  queryCount: number;
  updateCount: number;
} {
  let totalActivityCount = 0;
  let signalCount = 0;
  let queryCount = 0;
  let updateCount = 0;

  // Count global activities
  const globalActivityCount = contract.activities ? Object.keys(contract.activities).length : 0;

  // Count workflow-specific activities and other operations
  for (const workflow of Object.values(contract.workflows)) {
    if (workflow.activities) {
      totalActivityCount += Object.keys(workflow.activities).length;
    }
    if (workflow.signals) {
      signalCount += Object.keys(workflow.signals).length;
    }
    if (workflow.queries) {
      queryCount += Object.keys(workflow.queries).length;
    }
    if (workflow.updates) {
      updateCount += Object.keys(workflow.updates).length;
    }
  }

  totalActivityCount += globalActivityCount;

  return {
    workflowCount: Object.keys(contract.workflows).length,
    globalActivityCount,
    totalActivityCount,
    signalCount,
    queryCount,
    updateCount,
  };
}

/**
 * Merge multiple contracts into one. Useful for modular contract definitions.
 * Note: Workflows and activities with the same name in later contracts will override earlier ones.
 *
 * @param taskQueue - The task queue for the merged contract
 * @param contracts - Array of contracts to merge
 * @returns A new merged contract
 * @throws {Error} If contracts array is empty
 *
 * @example
 * ```typescript
 * const orderContract = defineContract({ ... });
 * const paymentContract = defineContract({ ... });
 *
 * const mergedContract = mergeContracts('combined', [orderContract, paymentContract]);
 * ```
 */
export function mergeContracts(
  taskQueue: string,
  contracts: ContractDefinition[],
): ContractDefinition {
  if (contracts.length === 0) {
    throw new Error("Cannot merge empty contracts array");
  }

  const merged: ContractDefinition = {
    taskQueue,
    workflows: {},
  };

  // Track if we've seen any activities
  let hasActivities = false;

  for (const contract of contracts) {
    // Merge workflows
    Object.assign(merged.workflows, contract.workflows);

    // Merge global activities
    if (contract.activities) {
      if (!hasActivities) {
        (merged as { activities: Record<string, ActivityDefinition> }).activities = {
          ...contract.activities,
        };
        hasActivities = true;
      } else {
        Object.assign(merged.activities!, contract.activities);
      }
    }
  }

  return merged;
}

/**
 * Validate that a value matches the structure expected for a contract.
 * This is a lightweight check and doesn't perform schema validation.
 *
 * @param value - The value to check
 * @returns True if the value appears to be a valid contract
 *
 * @example
 * ```typescript
 * if (isContract(myValue)) {
 *   // Safe to use as a contract
 * }
 * ```
 */
export function isContract(value: unknown): value is ContractDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj["taskQueue"] === "string" &&
    typeof obj["workflows"] === "object" &&
    obj["workflows"] !== null &&
    Object.keys(obj["workflows"]).length > 0
  );
}
