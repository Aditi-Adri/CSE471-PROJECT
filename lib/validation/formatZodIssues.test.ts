import { describe, expect, it } from "vitest";
import { z } from "zod";
import { firstIssueMessage } from "./formatZodIssues";

describe("firstIssueMessage", () => {
  it("pulls the first field-level message out of a treeified zod error", () => {
    const schema = z.object({ phone: z.string().regex(/^\d+$/, "Enter a valid phone number.") });
    const result = schema.safeParse({ phone: "not-a-number" });
    if (result.success) throw new Error("expected failure");
    expect(firstIssueMessage(z.treeifyError(result.error), "fallback")).toBe("Enter a valid phone number.");
  });

  it("falls back when issues is missing or malformed", () => {
    expect(firstIssueMessage(undefined, "fallback")).toBe("fallback");
    expect(firstIssueMessage(null, "fallback")).toBe("fallback");
    expect(firstIssueMessage({}, "fallback")).toBe("fallback");
  });

  it("falls back to top-level errors when no per-field issue exists", () => {
    const schema = z.object({ a: z.string() }).refine(() => false, { message: "Whole-object problem." });
    const result = schema.safeParse({ a: "x" });
    if (result.success) throw new Error("expected failure");
    expect(firstIssueMessage(z.treeifyError(result.error), "fallback")).toBe("Whole-object problem.");
  });
});
