import { describe, it, expect } from "vitest";
import { shouldOpenOutage, shouldResolveOutage } from "../../src/server/incidents/outages.js";
import type { HealthState } from "../../src/server/types.js";

describe("shouldOpenOutage", () => {
  it("returns true when transitioning to down from healthy", () => {
    expect(shouldOpenOutage("healthy", "down")).toBe(true);
  });

  it("returns true when transitioning to down from unknown", () => {
    expect(shouldOpenOutage("unknown", "down")).toBe(true);
  });

  it("returns false when staying down", () => {
    expect(shouldOpenOutage("down", "down")).toBe(false);
  });

  it("returns false when staying healthy", () => {
    expect(shouldOpenOutage("healthy", "healthy")).toBe(false);
  });

  it("returns false when transitioning to healthy", () => {
    expect(shouldOpenOutage("down", "healthy")).toBe(false);
  });
});

describe("shouldResolveOutage", () => {
  it("returns true when transitioning from down to healthy", () => {
    expect(shouldResolveOutage("down", "healthy")).toBe(true);
  });

  it("returns false when staying healthy", () => {
    expect(shouldResolveOutage("healthy", "healthy")).toBe(false);
  });

  it("returns false when staying down", () => {
    expect(shouldResolveOutage("down", "down")).toBe(false);
  });

  it("returns false when transitioning to down", () => {
    expect(shouldResolveOutage("healthy", "down")).toBe(false);
  });
});
