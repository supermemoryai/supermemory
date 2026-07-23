/**
 * Unit tests for coerceConnectorWorkflowDefect in plan-entitlement.ts
 */

import { describe, it, expect } from "vitest";
import {
  coerceConnectorWorkflowDefect,
  type ConnectorSyncError,
} from "../plan-entitlement.js";
import { DurableObjectResetError } from "../../../lib/do-retry.js";

describe("coerceConnectorWorkflowDefect", () => {
  it("classifies DurableObjectResetError as 'do_lifecycle_reset'", () => {
    const defect = new DurableObjectResetError(
      "Grace period complete after retries"
    );
    const error: ConnectorSyncError = coerceConnectorWorkflowDefect(defect);
    expect(error.kind).toBe("do_lifecycle_reset");
    expect(error.message).toContain("Grace period complete");
    expect(error.cause).toBe(defect);
  });

  it("classifies raw DO reset errors as 'do_lifecycle_reset'", () => {
    const defect = Object.assign(
      new Error("Aborting engine: Grace period complete"),
      { durableObjectReset: true }
    );
    const error = coerceConnectorWorkflowDefect(defect);
    expect(error.kind).toBe("do_lifecycle_reset");
    expect(error.message).toContain("unretried");
  });

  it("classifies destroyed DO errors as 'do_lifecycle_reset'", () => {
    const defect = new Error("isolate destroyed");
    const error = coerceConnectorWorkflowDefect(defect);
    expect(error.kind).toBe("do_lifecycle_reset");
  });

  it("classifies unrelated errors as 'unhandled_defect'", () => {
    const defect = new Error("SyntaxError: unexpected token");
    const error = coerceConnectorWorkflowDefect(defect);
    expect(error.kind).toBe("unhandled_defect");
    expect(error.message).toBe("SyntaxError: unexpected token");
    expect(error.cause).toBe(defect);
  });

  it("handles non-Error defects as 'unhandled_defect'", () => {
    const defect = "raw string defect";
    const error = coerceConnectorWorkflowDefect(defect);
    expect(error.kind).toBe("unhandled_defect");
    expect(error.message).toBe("raw string defect");
  });

  it("handles null/undefined defects gracefully", () => {
    const error = coerceConnectorWorkflowDefect(null);
    expect(error.kind).toBe("unhandled_defect");
    expect(error.message).toBe("null");
  });
});
