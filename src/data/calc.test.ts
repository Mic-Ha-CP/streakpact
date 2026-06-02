import { describe, it, expect } from "vitest";
import { combineTeamMonth, type MonthResult } from "./calc";

describe("combineTeamMonth", () => {
  // success only when BOTH succeed
  it("both success → team success", () => {
    expect(combineTeamMonth("success", "success")).toBe("success");
  });

  // failure if EITHER fails (failure dominates, even over the partner's success)
  it.each<[MonthResult, MonthResult]>([
    ["failure", "success"],
    ["success", "failure"],
    ["failure", "failure"],
    ["failure", "neutral"],
    ["neutral", "failure"],
  ])("%s + %s → team failure", (a, b) => {
    expect(combineTeamMonth(a, b)).toBe("failure");
  });

  // everything else (no failure, not both-success) → neutral
  it.each<[MonthResult, MonthResult]>([
    ["success", "neutral"],
    ["neutral", "success"],
    ["neutral", "neutral"],
  ])("%s + %s → team neutral", (a, b) => {
    expect(combineTeamMonth(a, b)).toBe("neutral");
  });

  // null = a member with no tasks → not settleable
  it("null on either side → null (not settleable)", () => {
    expect(combineTeamMonth(null, "success")).toBeNull();
    expect(combineTeamMonth("failure", null)).toBeNull();
    expect(combineTeamMonth(null, null)).toBeNull();
  });
});
