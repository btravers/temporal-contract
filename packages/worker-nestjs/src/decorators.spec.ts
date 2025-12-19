import { describe, it, expect } from "vitest";
import { TemporalActivity, getActivityHandlers } from "../src/decorators";

describe("TemporalActivity decorator", () => {
  it("should store metadata for activity handlers", () => {
    class TestService {
      @TemporalActivity("testWorkflow", "testActivity")
      testMethod() {
        return "test";
      }

      @TemporalActivity("testWorkflow", "anotherActivity")
      anotherMethod() {
        return "another";
      }
    }

    const instance = new TestService();
    const handlers = getActivityHandlers(instance);

    expect(handlers).toHaveLength(2);
    expect(handlers[0]).toMatchObject({
      workflowName: "testWorkflow",
      activityName: "testActivity",
      methodName: "testMethod",
    });
    expect(handlers[1]).toMatchObject({
      workflowName: "testWorkflow",
      activityName: "anotherActivity",
      methodName: "anotherMethod",
    });
  });

  it("should return empty array for class without decorators", () => {
    class TestService {
      testMethod() {
        return "test";
      }
    }

    const instance = new TestService();
    const handlers = getActivityHandlers(instance);

    expect(handlers).toHaveLength(0);
  });
});
