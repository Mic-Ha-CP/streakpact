import { describe, expect, it } from "vitest";
import { weekdayCN, startOfWeekISO, shiftDate, monthOfWeek } from "./dates";

describe("weekdayCN", () => {
  it("labels the weekday (week starts Monday)", () => {
    expect(weekdayCN("2026-06-08")).toBe("周一"); // Mon
    expect(weekdayCN("2026-06-09")).toBe("周二");
    expect(weekdayCN("2026-06-14")).toBe("周日"); // Sun
  });
});

describe("startOfWeekISO", () => {
  it("returns the Monday of the week", () => {
    expect(startOfWeekISO("2026-06-08")).toBe("2026-06-08"); // Mon -> itself
    expect(startOfWeekISO("2026-06-11")).toBe("2026-06-08"); // Thu -> Mon
    expect(startOfWeekISO("2026-06-14")).toBe("2026-06-08"); // Sun -> Mon
  });

  it("crosses month/year boundaries", () => {
    expect(startOfWeekISO("2026-01-01")).toBe("2025-12-29"); // Thu -> prev Mon
  });

  it("the 7 days from the Monday cover Mon..Sun", () => {
    const mon = startOfWeekISO("2026-06-11");
    const days = Array.from({ length: 7 }, (_, i) => shiftDate(mon, i));
    expect(days[0]).toBe("2026-06-08");
    expect(days[6]).toBe("2026-06-14");
    expect(weekdayCN(days[0])).toBe("周一");
    expect(weekdayCN(days[6])).toBe("周日");
  });
});

// The accountability month = the calendar month of the week's Monday. On the
// carry-in days at the start of a month (before its first Monday), this is the
// PREVIOUS month — the exact source of the June/July boundary bug.
describe("monthOfWeek", () => {
  it("a normal mid-month day → its own calendar month", () => {
    expect(monthOfWeek("2026-07-15")).toBe("2026-07"); // Wed, week ∈ July
  });
  it("2026-07-02 belongs to June (Jul 1–5 ∈ June W5) — the reported bug", () => {
    expect(monthOfWeek("2026-07-02")).toBe("2026-06");
  });
  it("Mon 2026-06-29 (June W5 start) → June", () => {
    expect(monthOfWeek("2026-06-29")).toBe("2026-06");
  });
  it("Mon 2026-07-06 (July W1 start) → July", () => {
    expect(monthOfWeek("2026-07-06")).toBe("2026-07");
  });
  it("1st is a Monday → no carry-in, the month owns its own 1st (June 2026)", () => {
    expect(monthOfWeek("2026-06-01")).toBe("2026-06");
  });
  it("1st is a Sunday → that day carries into the previous month (2026-02-01 ∈ Jan)", () => {
    expect(monthOfWeek("2026-02-01")).toBe("2026-01");
  });
  it("1st is a Tuesday → the first 6 days carry into the previous month (Sep 2026 ∈ Aug)", () => {
    expect(monthOfWeek("2026-09-01")).toBe("2026-08"); // Tue
    expect(monthOfWeek("2026-09-06")).toBe("2026-08"); // Sun, still Aug W5
    expect(monthOfWeek("2026-09-07")).toBe("2026-09"); // Mon → Sept W1
  });
});
