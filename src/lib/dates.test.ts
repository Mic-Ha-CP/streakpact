import { describe, expect, it } from "vitest";
import { weekdayCN, startOfWeekISO, shiftDate } from "./dates";

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
