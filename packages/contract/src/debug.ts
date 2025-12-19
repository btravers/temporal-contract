import type { ContractDefinition } from "./types.js";

/**
 * Generate a human-readable summary of a contract for debugging purposes.
 *
 * @param contract - The contract definition
 * @returns A formatted string describing the contract structure
 *
 * @example
 * ```typescript
 * console.log(debugContract(myContract));
 * // Contract: orders
 * //   Workflows: 2
 * //     - processOrder (activities: 3, signals: 1, queries: 1)
 * //     - cancelOrder (activities: 1)
 * //   Global Activities: 1
 * ```
 */
export function debugContract(contract: ContractDefinition): string {
  const lines: string[] = [];

  lines.push(`Contract: ${contract.taskQueue}`);

  // Workflows
  const workflowCount = Object.keys(contract.workflows).length;
  lines.push(`  Workflows: ${workflowCount}`);

  for (const [name, workflow] of Object.entries(contract.workflows)) {
    const parts: string[] = [];

    const activityCount = workflow.activities ? Object.keys(workflow.activities).length : 0;
    if (activityCount > 0) {
      parts.push(`activities: ${activityCount}`);
    }

    const signalCount = workflow.signals ? Object.keys(workflow.signals).length : 0;
    if (signalCount > 0) {
      parts.push(`signals: ${signalCount}`);
    }

    const queryCount = workflow.queries ? Object.keys(workflow.queries).length : 0;
    if (queryCount > 0) {
      parts.push(`queries: ${queryCount}`);
    }

    const updateCount = workflow.updates ? Object.keys(workflow.updates).length : 0;
    if (updateCount > 0) {
      parts.push(`updates: ${updateCount}`);
    }

    const info = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    lines.push(`    - ${name}${info}`);
  }

  // Global activities
  if (contract.activities) {
    const globalActivityCount = Object.keys(contract.activities).length;
    lines.push(`  Global Activities: ${globalActivityCount}`);
  }

  return lines.join("\n");
}

/**
 * Generate a detailed JSON representation of a contract for debugging.
 *
 * Note: This excludes the actual schema objects to keep output readable.
 *
 * @param contract - The contract definition
 * @returns A JSON-serializable object describing the contract structure
 *
 * @example
 * ```typescript
 * console.log(JSON.stringify(debugContractJSON(myContract), null, 2));
 * ```
 */
export function debugContractJSON(contract: ContractDefinition): Record<string, unknown> {
  const result: Record<string, unknown> = {
    taskQueue: contract.taskQueue,
    workflows: {},
  };

  // Process workflows
  const workflows: Record<string, unknown> = {};
  for (const [name, workflow] of Object.entries(contract.workflows)) {
    workflows[name] = {
      hasInput: Boolean(workflow.input),
      hasOutput: Boolean(workflow.output),
      activities: workflow.activities ? Object.keys(workflow.activities) : [],
      signals: workflow.signals ? Object.keys(workflow.signals) : [],
      queries: workflow.queries ? Object.keys(workflow.queries) : [],
      updates: workflow.updates ? Object.keys(workflow.updates) : [],
    };
  }
  result["workflows"] = workflows;

  // Process global activities
  if (contract.activities) {
    result["activities"] = Object.keys(contract.activities);
  }

  return result;
}

/**
 * Validate that all workflow and activity names follow naming conventions.
 * Returns an array of validation issues (empty if everything is valid).
 *
 * @param contract - The contract definition
 * @returns Array of validation messages (empty if valid)
 *
 * @example
 * ```typescript
 * const issues = validateContractNaming(myContract);
 * if (issues.length > 0) {
 *   console.warn('Contract naming issues:', issues);
 * }
 * ```
 */
export function validateContractNaming(contract: ContractDefinition): string[] {
  const issues: string[] = [];
  const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;

  // Check workflow names
  for (const name of Object.keys(contract.workflows)) {
    if (!camelCasePattern.test(name)) {
      issues.push(
        `Workflow '${name}' does not follow camelCase convention (should start with lowercase letter)`,
      );
    }
  }

  // Check global activity names
  if (contract.activities) {
    for (const name of Object.keys(contract.activities)) {
      if (!camelCasePattern.test(name)) {
        issues.push(
          `Global activity '${name}' does not follow camelCase convention (should start with lowercase letter)`,
        );
      }
    }
  }

  // Check workflow-specific activity names
  for (const [workflowName, workflow] of Object.entries(contract.workflows)) {
    if (workflow.activities) {
      for (const name of Object.keys(workflow.activities)) {
        if (!camelCasePattern.test(name)) {
          issues.push(
            `Activity '${name}' in workflow '${workflowName}' does not follow camelCase convention`,
          );
        }
      }
    }

    // Check signal names
    if (workflow.signals) {
      for (const name of Object.keys(workflow.signals)) {
        if (!camelCasePattern.test(name)) {
          issues.push(
            `Signal '${name}' in workflow '${workflowName}' does not follow camelCase convention`,
          );
        }
      }
    }

    // Check query names
    if (workflow.queries) {
      for (const name of Object.keys(workflow.queries)) {
        if (!camelCasePattern.test(name)) {
          issues.push(
            `Query '${name}' in workflow '${workflowName}' does not follow camelCase convention`,
          );
        }
      }
    }

    // Check update names
    if (workflow.updates) {
      for (const name of Object.keys(workflow.updates)) {
        if (!camelCasePattern.test(name)) {
          issues.push(
            `Update '${name}' in workflow '${workflowName}' does not follow camelCase convention`,
          );
        }
      }
    }
  }

  return issues;
}

/**
 * Compare two contracts and return the differences.
 * Useful for version migration and compatibility checks.
 *
 * @param oldContract - The previous contract version
 * @param newContract - The new contract version
 * @returns Object describing the differences between contracts
 *
 * @example
 * ```typescript
 * const diff = compareContracts(oldVersion, newVersion);
 * console.log('Added workflows:', diff.addedWorkflows);
 * console.log('Removed workflows:', diff.removedWorkflows);
 * ```
 */
export function compareContracts(
  oldContract: ContractDefinition,
  newContract: ContractDefinition,
): {
  taskQueueChanged: boolean;
  addedWorkflows: string[];
  removedWorkflows: string[];
  addedGlobalActivities: string[];
  removedGlobalActivities: string[];
  modifiedWorkflows: string[];
} {
  const oldWorkflows = new Set(Object.keys(oldContract.workflows));
  const newWorkflows = new Set(Object.keys(newContract.workflows));

  const oldGlobalActivities = new Set(
    oldContract.activities ? Object.keys(oldContract.activities) : [],
  );
  const newGlobalActivities = new Set(
    newContract.activities ? Object.keys(newContract.activities) : [],
  );

  // Find added and removed workflows
  const addedWorkflows = Array.from(newWorkflows).filter((w) => !oldWorkflows.has(w));
  const removedWorkflows = Array.from(oldWorkflows).filter((w) => !newWorkflows.has(w));

  // Find modified workflows (workflows that exist in both but might have changed)
  const commonWorkflows = Array.from(newWorkflows).filter((w) => oldWorkflows.has(w));
  const modifiedWorkflows = commonWorkflows.filter((name) => {
    const oldWf = oldContract.workflows[name];
    const newWf = newContract.workflows[name];

    // Both should exist since they're in commonWorkflows
    if (!oldWf || !newWf) return false;

    // Compare activity counts
    const oldActivityCount = oldWf.activities ? Object.keys(oldWf.activities).length : 0;
    const newActivityCount = newWf.activities ? Object.keys(newWf.activities).length : 0;

    if (oldActivityCount !== newActivityCount) return true;

    // Compare signal counts
    const oldSignalCount = oldWf.signals ? Object.keys(oldWf.signals).length : 0;
    const newSignalCount = newWf.signals ? Object.keys(newWf.signals).length : 0;

    if (oldSignalCount !== newSignalCount) return true;

    // Compare query counts
    const oldQueryCount = oldWf.queries ? Object.keys(oldWf.queries).length : 0;
    const newQueryCount = newWf.queries ? Object.keys(newWf.queries).length : 0;

    if (oldQueryCount !== newQueryCount) return true;

    // Compare update counts
    const oldUpdateCount = oldWf.updates ? Object.keys(oldWf.updates).length : 0;
    const newUpdateCount = newWf.updates ? Object.keys(newWf.updates).length : 0;

    return oldUpdateCount !== newUpdateCount;
  });

  // Find added and removed global activities
  const addedGlobalActivities = Array.from(newGlobalActivities).filter(
    (a) => !oldGlobalActivities.has(a),
  );
  const removedGlobalActivities = Array.from(oldGlobalActivities).filter(
    (a) => !newGlobalActivities.has(a),
  );

  return {
    taskQueueChanged: oldContract.taskQueue !== newContract.taskQueue,
    addedWorkflows,
    removedWorkflows,
    addedGlobalActivities,
    removedGlobalActivities,
    modifiedWorkflows,
  };
}
