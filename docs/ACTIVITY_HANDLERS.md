# Activity Handler Utility Types

Cette documentation décrit les types utilitaires disponibles pour simplifier le typage des handlers d'activités.

## Vue d'ensemble

Au lieu de typer explicitement les paramètres et retours avec `WorkerInferInput` et `WorkerInferOutput`, vous pouvez utiliser des types utilitaires qui encapsulent toute la signature de la fonction.

## Types disponibles

### Pour les activités standards

#### `ActivityHandler<TContract, TActivityName>`

Type utilitaire pour typer un handler d'**activité globale** définie au niveau du contrat.

**Exemple :**

```typescript
import type { ActivityHandler } from "@temporal-contract/contract";
import { myContract } from "./contract.js";

// ✅ Avec le type utilitaire
const log: ActivityHandler<typeof myContract, "log"> = async ({ level, message }) => {
  logger[level](message);
};

// ❌ Sans le type utilitaire (verbeux)
const log = async ({
  level,
  message
}: WorkerInferInput<typeof myContract.activities.log>): Promise<WorkerInferOutput<typeof myContract.activities.log>> => {
  logger[level](message);
};
```

#### `WorkflowActivityHandler<TContract, TWorkflowName, TActivityName>`

Type utilitaire pour typer un handler d'**activité spécifique à un workflow**.

**Exemple :**

```typescript
import type { WorkflowActivityHandler } from "@temporal-contract/contract";
import { myContract } from "./contract.js";

// ✅ Avec le type utilitaire
const processPayment: WorkflowActivityHandler<
  typeof myContract,
  "processOrder",
  "processPayment"
> = async ({ customerId, amount }) => {
  // TypeScript infère automatiquement les types de customerId et amount
  return {
    transactionId: "txn123",
    status: "success" as const,
    paidAmount: amount,
  };
};

// ❌ Sans le type utilitaire (très verbeux)
const processPayment = async ({
  customerId,
  amount,
}: WorkerInferInput<typeof myContract.workflows.processOrder.activities.processPayment>): Promise<WorkerInferOutput<typeof myContract.workflows.processOrder.activities.processPayment>> => {
  // ...
};
```

### Pour les activités avec pattern Result/Future (@swan-io/boxed)

> ⚠️ **Important :** Toujours importer depuis `@temporal-contract/worker-boxed/activity` dans les fichiers d'activités.

#### `BoxedActivityHandler<TContract, TActivityName>`

Type utilitaire pour typer un handler d'**activité globale** utilisant le pattern Result/Future.

**Exemple :**

```typescript
import { Future, Result } from "@swan-io/boxed";
import type { BoxedActivityHandler } from "@temporal-contract/worker-boxed/activity";
import { myContract } from "./contract.js";

const log: BoxedActivityHandler<typeof myContract, "log"> = ({
  level,
  message,
}: {
  level: string;
  message: string;
}) => {
  return Future.make((resolve) => {
    logger[level](message);
    resolve(Result.Ok(undefined));
  });
};
```

**Note :** Pour les activités boxed, vous devez toujours annoter explicitement les paramètres car TypeScript n'infère pas les paramètres des fonctions de rappel.

#### `BoxedWorkflowActivityHandler<TContract, TWorkflowName, TActivityName>`

Type utilitaire pour typer un handler d'**activité spécifique à un workflow** utilisant le pattern Result/Future.

**Exemple :**

```typescript
import { Future, Result } from "@swan-io/boxed";
import type { BoxedWorkflowActivityHandler } from "@temporal-contract/worker-boxed/activity";
import { myContract } from "./contract.js";

const processPayment: BoxedWorkflowActivityHandler<
  typeof myContract,
  "processOrder",
  "processPayment"
> = ({ customerId, amount }: { customerId: string; amount: number }) => {
  return Future.make((resolve) => {
    // Simulate payment processing
    const transactionId = `txn-${Date.now()}`;

    resolve(
      Result.Ok({
        transactionId,
        status: "success" as const,
        paidAmount: amount,
      })
    );
  });
};
```

## Avantages

✅ **Code plus concis** : Moins de verbosité, plus lisible

✅ **Maintenabilité** : Le type de retour est automatiquement déduit du contrat

✅ **Type safety** : TypeScript vérifie que la signature correspond au contrat

✅ **DX améliorée** : Autocomplétion et IntelliSense fonctionnent parfaitement

## Exemples complets

### Activités standards (basic-order-processing)

```typescript
import { declareActivitiesHandler } from "@temporal-contract/worker";
import type { ActivityHandler, WorkflowActivityHandler } from "@temporal-contract/contract";
import { orderProcessingContract } from "../contract.js";

// Activité globale
const log: ActivityHandler<typeof orderProcessingContract, "log"> = async ({ level, message }) => {
  logger[level](message);
};

const sendNotification: ActivityHandler<
  typeof orderProcessingContract,
  "sendNotification"
> = async ({ customerId, subject, message }) => {
  logger.info({ customerId, subject }, `Sending notification to ${customerId}`);
  // ...
};

// Activités du workflow
const processPayment: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "processPayment"
> = async ({ customerId, amount }) => {
  return {
    transactionId: `TXN${Date.now()}`,
    status: "success" as const,
    paidAmount: amount,
  };
};

const reserveInventory: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "reserveInventory"
> = async (items) => {
  return {
    reserved: true,
    reservationId: `RES${Date.now()}`,
  };
};

export const activitiesHandler = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    log,
    sendNotification,
    processPayment,
    reserveInventory,
  },
});
```

### Activités avec Result/Future (boxed-order-processing)

```typescript
import { Future, Result } from "@swan-io/boxed";
import { declareActivitiesHandler } from "@temporal-contract/worker-boxed/activity";
import type {
  BoxedActivityHandler,
  BoxedWorkflowActivityHandler,
} from "@temporal-contract/worker-boxed/activity";
import { boxedOrderContract } from "../contract.js";

// Activité globale
const log: BoxedActivityHandler<typeof boxedOrderContract, "log"> = ({
  level,
  message,
}: {
  level: string;
  message: string;
}) => {
  return Future.make((resolve) => {
    logger[level](message);
    resolve(Result.Ok(undefined));
  });
};

// Activité du workflow
const processPayment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "processPayment"
> = ({ customerId, amount }: { customerId: string; amount: number }) => {
  return Future.make((resolve) => {
    const success = Math.random() > 0.1;

    if (success) {
      resolve(
        Result.Ok({
          transactionId: `txn-${Date.now()}`,
          status: "success" as const,
          paidAmount: amount,
        })
      );
    } else {
      resolve(
        Result.Error({
          code: "PAYMENT_FAILED",
          message: "Payment declined",
          details: { customerId, amount },
        })
      );
    }
  });
};
```

## Cas particuliers

### Activités avec des paramètres scalaires

Pour les activités dont l'input est un type scalaire (string, number, etc.) et non un objet :

```typescript
const releaseInventory: WorkflowActivityHandler<
  typeof myContract,
  "processOrder",
  "releaseInventory"
> = async (reservationId) => {
  // reservationId est typé automatiquement comme string
  logger.info({ reservationId }, `Releasing inventory`);
};
```

### Activités retournant void

```typescript
const releaseInventory: WorkflowActivityHandler<
  typeof myContract,
  "processOrder",
  "releaseInventory"
> = async (reservationId) => {
  logger.info({ reservationId }, `Releasing inventory`);
  // Pas besoin de return, le type de retour est automatiquement Promise<void>
};
```

## Tests

Des tests complets sont disponibles dans `/packages/contract/src/types.spec.ts` démontrant l'utilisation de ces types :

```typescript
describe("Activity Handler Utility Types", () => {
  it("should correctly type a global activity handler", async () => {
    const contract = {
      taskQueue: "test",
      activities: {
        log: {
          input: z.object({ level: z.string(), message: z.string() }),
          output: z.void(),
        },
      },
      workflows: {},
    } satisfies ContractDefinition;

    const log: ActivityHandler<typeof contract, "log"> = async ({ level, message }) => {
      expect(level).toBe("info");
      expect(message).toBe("test");
    };

    await log({ level: "info", message: "test" });
  });

  it("should correctly type a workflow-specific activity handler", async () => {
    // Voir types.spec.ts pour l'exemple complet
  });
});
```

## Références

- [Types contract](/packages/contract/src/types.ts)
- [Tests types](/packages/contract/src/types.spec.ts)
- [Exemple basic-order-processing](/samples/basic-order-processing/src/activities/index.ts)
- [Exemple boxed-order-processing](/samples/boxed-order-processing/src/activities/index.ts)
