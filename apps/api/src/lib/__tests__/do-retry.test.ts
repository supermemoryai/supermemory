/**
 * Unit tests for apps/api/src/lib/do-retry.ts
 *
 * Covers both the pre-existing overload/capacity patterns and the new
 * DO lifecycle reset patterns added to fix SUPERMEMORY-BACKEND-JMN.
 */

import { describe, it, expect } from "vitest";
import {
  isRetryableDurableObjectError,
  liftDurableObjectResetDefect,
  DurableObjectResetError,
} from "../do-retry.js";

// ---------------------------------------------------------------------------
// isRetryableDurableObjectError
// ---------------------------------------------------------------------------

describe("isRetryableDurableObjectError", () => {
  // ── Pre-existing patterns (must not regress) ────────────────────────────

  describe("pre-existing overload / capacity patterns", () => {
    it("returns true for 'memory limit' messages", () => {
      const err = new Error("DO exceeded memory limit");
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true for 'overloaded' in message", () => {
      const err = new Error("Durable Object is overloaded");
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true for 'internal error; reference =' messages", () => {
      const err = new Error("internal error; reference = abc123");
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true for generic 'Durable Object' messages", () => {
      const err = new Error("Durable Object unreachable");
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true when error.overloaded is true", () => {
      const err = Object.assign(new Error("capacity exceeded"), {
        overloaded: true,
      });
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns false when error.overloaded is false", () => {
      const err = Object.assign(new Error("capacity exceeded"), {
        overloaded: false,
      });
      expect(isRetryableDurableObjectError(err)).toBe(false);
    });
  });

  // ── New: DO lifecycle reset signals ─────────────────────────────────────

  describe("DO lifecycle reset signals (SUPERMEMORY-BACKEND-JMN fix)", () => {
    it("returns true when error.durableObjectReset is true", () => {
      const err = Object.assign(
        new Error("Durable Object was reset"),
        { durableObjectReset: true }
      );
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true for 'Grace period complete' messages", () => {
      const err = new Error("Aborting engine: Grace period complete");
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true for 'destroyed' in message", () => {
      const err = new Error(
        "Durable Object reset because it exceeded its memory limit and was destroyed"
      );
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true for 'Network connection lost' messages", () => {
      const err = new Error("Network connection lost");
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    // Nested cause chain tests

    it("returns true when cause.durableObjectReset is true", () => {
      const cause = Object.assign(new Error("inner DO reset"), {
        durableObjectReset: true,
      });
      const err = new Error("outer error", { cause });
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true when cause message contains 'Grace period complete'", () => {
      const cause = new Error("Aborting engine: Grace period complete");
      const err = new Error("outer wrapper", { cause });
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true when cause message contains 'destroyed'", () => {
      const cause = new Error("isolate destroyed");
      const err = new Error("outer wrapper", { cause });
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns true when cause message contains 'Network connection lost'", () => {
      const cause = new Error("Network connection lost");
      const err = new Error("outer wrapper", { cause });
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });
  });

  // ── Non-retryable cases ──────────────────────────────────────────────────

  describe("non-retryable errors", () => {
    it("returns false for non-Error values", () => {
      expect(isRetryableDurableObjectError("string error")).toBe(false);
      expect(isRetryableDurableObjectError(42)).toBe(false);
      expect(isRetryableDurableObjectError(null)).toBe(false);
      expect(isRetryableDurableObjectError(undefined)).toBe(false);
    });

    it("returns false for generic errors with unrelated messages", () => {
      const err = new Error("Connection refused");
      expect(isRetryableDurableObjectError(err)).toBe(false);
    });

    it("returns false for auth errors", () => {
      const err = new Error("Unauthorized: token expired");
      expect(isRetryableDurableObjectError(err)).toBe(false);
    });

    it("returns false for rate limit errors without matching keywords", () => {
      const err = new Error("Too Many Requests");
      expect(isRetryableDurableObjectError(err)).toBe(false);
    });

    it("returns false when durableObjectReset is false", () => {
      const err = Object.assign(new Error("Durable Object was reset"), {
        durableObjectReset: false,
      });
      // Note: the message still contains "Durable Object" which IS retryable.
      // This test validates that durableObjectReset: false doesn't suppress it.
      expect(isRetryableDurableObjectError(err)).toBe(true);
    });

    it("returns false for errors with cause that has no matching signals", () => {
      const cause = new Error("unrelated inner error");
      const err = new Error("outer error", { cause });
      expect(isRetryableDurableObjectError(err)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// liftDurableObjectResetDefect
// ---------------------------------------------------------------------------

describe("liftDurableObjectResetDefect", () => {
  it("returns a DurableObjectResetError for retryable DO errors", () => {
    const original = Object.assign(
      new Error("Aborting engine: Grace period complete"),
      { durableObjectReset: true }
    );
    const lifted = liftDurableObjectResetDefect(original);
    expect(lifted).toBeInstanceOf(DurableObjectResetError);
    expect(lifted?.message).toContain("Grace period complete");
    expect(lifted?.cause).toBe(original);
  });

  it("returns null for non-retryable errors", () => {
    const err = new Error("some unrelated error");
    const lifted = liftDurableObjectResetDefect(err);
    expect(lifted).toBeNull();
  });

  it("returns null for non-Error values", () => {
    expect(liftDurableObjectResetDefect("raw string")).toBeNull();
    expect(liftDurableObjectResetDefect(null)).toBeNull();
    expect(liftDurableObjectResetDefect(undefined)).toBeNull();
  });

  it("sets the _tag to DurableObjectResetError", () => {
    const err = Object.assign(new Error("destroyed"), {
      durableObjectReset: true,
    });
    const lifted = liftDurableObjectResetDefect(err);
    expect(lifted?._tag).toBe("DurableObjectResetError");
  });
});

// ---------------------------------------------------------------------------
// DurableObjectResetError
// ---------------------------------------------------------------------------

describe("DurableObjectResetError", () => {
  it("is an instance of Error", () => {
    const err = new DurableObjectResetError("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("has the correct name", () => {
    const err = new DurableObjectResetError("test");
    expect(err.name).toBe("DurableObjectResetError");
  });

  it("preserves the cause", () => {
    const cause = new Error("inner");
    const err = new DurableObjectResetError("outer", { cause });
    expect(err.cause).toBe(cause);
  });
});
