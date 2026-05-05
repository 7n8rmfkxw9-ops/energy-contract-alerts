import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins simple class strings", () => {
    expect(cn("p-2", "m-1")).toBe("p-2 m-1");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("supports conditional object syntax from clsx", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("flattens nested arrays", () => {
    expect(cn(["a", ["b", ["c"]]], "d")).toBe("a b c d");
  });

  it("merges conflicting Tailwind utilities, keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-base", "text-lg")).toBe("text-lg");
  });

  it("preserves non-conflicting Tailwind utilities", () => {
    expect(cn("p-2", "m-1", "text-sm")).toBe("p-2 m-1 text-sm");
  });

  it("returns an empty string when given no truthy inputs", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });
});
