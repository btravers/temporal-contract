import { proxyActivities, WorkflowInfo, workflowInfo, ActivityOptions } from '@temporalio/workflow';
import type {
  ContractDefinition,
  InferInput,
  InferOutput,
  WorkflowDefinition,
  ActivityDefinition,
  InferWorkflowContextActivities,
} from '@temporal-contract/core';

/**
 * Workflow context with typed activities (workflow + global) and workflow info
 */
export interface WorkflowContext<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
> {
  activities: InferWorkflowContextActivities<TWorkflow, TContract>;
  info: WorkflowInfo;
}

/**
 * Raw workflow implementation function (receives context + typed args)
 */
export type RawWorkflowImplementation<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
> = (
  context: WorkflowContext<TWorkflow, TContract>,
  ...args: InferInput<TWorkflow>
) => Promise<InferOutput<TWorkflow>>;

/**
 * Raw activity implementation function (receives typed args)
 */
export type RawActivityImplementation<T extends ActivityDefinition> = (
  ...args: InferInput<T>
) => Promise<InferOutput<T>>;

/**
 * Map of workflow implementations for a contract
 */
export type WorkflowImplementations<T extends ContractDefinition> = {
  [K in keyof T['workflows']]: RawWorkflowImplementation<T['workflows'][K], T>;
};

/**
 * Map of all activity implementations for a contract (global + all workflow-specific)
 */
export type ActivityImplementations<T extends ContractDefinition> = 
  // Global activities
  (T['activities'] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T['activities']]: RawActivityImplementation<T['activities'][K]>;
      }
    : {}) &
  // All workflow-specific activities merged
  UnionToIntersection<
    {
      [K in keyof T['workflows']]: T['workflows'][K]['activities'] extends Record<string, ActivityDefinition>
        ? {
            [A in keyof T['workflows'][K]['activities']]: RawActivityImplementation<
              T['workflows'][K]['activities'][A]
            >;
          }
        : {};
    }[keyof T['workflows']]
  >;

/**
 * Utility type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Options for creating a contract handler
 */
export interface CreateContractHandlerOptions<T extends ContractDefinition> {
  contract: T;
  workflows: WorkflowImplementations<T>;
  activities: ActivityImplementations<T>;
  /**
   * Default activity options for all workflows
   */
  activityOptions?: ActivityOptions;
}

/**
 * Contract handler with wrapped implementations ready for Temporal Worker
 */
export interface ContractHandler<T extends ContractDefinition> {
  contract: T;
  workflows: Record<string, (...args: any[]) => Promise<any>>;
  activities: Record<string, (...args: any[]) => Promise<any>>;
}

/**
 * Create a validated activities proxy that parses inputs and outputs
 * 
 * This wrapper ensures data integrity across the network boundary between
 * workflow and activity execution.
 */
function createValidatedActivities<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
>(
  rawActivities: Record<string, (...args: any[]) => Promise<any>>,
  workflowActivitiesDefinition: Record<string, ActivityDefinition> | undefined,
  contractActivitiesDefinition: Record<string, ActivityDefinition> | undefined
): InferWorkflowContextActivities<TWorkflow, TContract> {
  const validatedActivities: Record<string, (...args: any[]) => Promise<any>> = {};

  // Merge workflow activities and global contract activities
  const allActivitiesDefinition = {
    ...contractActivitiesDefinition,
    ...workflowActivitiesDefinition, // Workflow activities override global ones
  };

  for (const [activityName, activityDef] of Object.entries(allActivitiesDefinition)) {
    const rawActivity = rawActivities[activityName];
    
    validatedActivities[activityName] = async (...args: any[]) => {
      // Validate input before sending over network
      const validatedInput = activityDef.input.parse(args);
      
      // Call the actual activity
      const result = await rawActivity(...validatedInput);
      
      // Validate output after receiving from network
      return activityDef.output.parse(result);
    };
  }

  return validatedActivities as InferWorkflowContextActivities<TWorkflow, TContract>;
}

/**
 * Create a typed contract handler with automatic validation
 * 
 * This wraps all workflow and activity implementations with Zod validation:
 * - Workflows: validates input/output, provides typed context with activities
 * - Activities: validates input/output at network boundaries
 * 
 * TypeScript ensures ALL workflows and activities are implemented.
 * 
 * @example
 * ```ts
 * import { createContractHandler } from '@temporal-contract/worker';
 * import myContract from './contract';
 * 
 * const handler = createContractHandler({
 *   contract: myContract,
 *   workflows: {
 *     processOrder: async (context, orderId, customerId) => {
 *       // context.activities has typed activities (workflow + global)
 *       // context.info has workflow info
 *       const inventory = await context.activities.validateInventory(orderId);
 *       return { orderId, status: 'success' };
 *     },
 *   },
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
 *   activityOptions: {
 *     startToCloseTimeout: '1 minute',
 *   },
 * });
 * 
 * // Use with Temporal Worker
 * import { Worker } from '@temporalio/worker';
 * 
 * const worker = await Worker.create({
 *   workflowsPath: require.resolve('./workflows'),
 *   activities: handler.activities,
 *   taskQueue: handler.contract.taskQueue,
 * });
 * ```
 */
export function createContractHandler<T extends ContractDefinition>(
  options: CreateContractHandlerOptions<T>
): ContractHandler<T> {
  const { contract, workflows, activities, activityOptions } = options;

  // Wrap activities with validation
  const wrappedActivities: Record<string, (...args: any[]) => Promise<any>> = {};
  
  for (const [activityName, activityImpl] of Object.entries(activities)) {
    // Find activity definition (global or workflow-specific)
    let activityDef: ActivityDefinition | undefined;
    
    // Check global activities
    if (contract.activities?.[activityName]) {
      activityDef = contract.activities[activityName];
    } else {
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
    
    wrappedActivities[activityName] = async (...args: any[]) => {
      // Validate input
      const validatedInput = activityDef.input.parse(args) as any;
      
      // Execute activity
      const result = await (activityImpl as any)(...validatedInput);
      
      // Validate output
      return activityDef.output.parse(result);
    };
  }

  // Wrap workflows with validation and context
  const wrappedWorkflows: Record<string, (...args: any[]) => Promise<any>> = {};
  
  for (const [workflowName, workflowImpl] of Object.entries(workflows)) {
    const workflowDef = contract.workflows[workflowName];
    
    if (!workflowDef) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
    }
    
    wrappedWorkflows[workflowName] = async (...args: any[]) => {
      // Validate workflow input
      const validatedInput = workflowDef.input.parse(args) as any;

      // Create activities proxy if activities are defined
      let contextActivities: any = {};
      
      if (workflowDef.activities || contract.activities) {
        const rawActivities = proxyActivities<Record<string, (...args: any[]) => Promise<any>>>({
          startToCloseTimeout: 60_000, // 1 minute default
          ...activityOptions,
        });
        
        contextActivities = createValidatedActivities(
          rawActivities,
          workflowDef.activities,
          contract.activities
        );
      }

      // Create workflow context
      const context = {
        activities: contextActivities,
        info: workflowInfo(),
      };

      // Execute workflow
      const result = await (workflowImpl as any)(context, ...validatedInput);

      // Validate workflow output
      return workflowDef.output.parse(result);
    };
  }

  return {
    contract,
    workflows: wrappedWorkflows,
    activities: wrappedActivities,
  };
}


