import { describe, expect, it } from "vitest";
import {
  BREAK_SECONDS,
  FOCUS_SECONDS,
  formatClock,
  pickCelebration,
} from "@/lib/pomodoro";

describe("pomodoro constants", () => {
  it("defaults to 25 min focus / 5 min break", () => {
    expect(FOCUS_SECONDS).toBe(25 * 60);
    expect(BREAK_SECONDS).toBe(5 * 60);
  });
});

describe("formatClock", () => {
  it("formats mm:ss with padding", () => {
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(300)).toBe("05:00");
    expect(formatClock(61)).toBe("01:01");
    expect(formatClock(0)).toBe("00:00");
  });
});

describe("pickCelebration", () => {
  it("always returns a non-empty message", () => {
    expect(pickCelebration(0).length).toBeGreaterThan(0);
    expect(pickCelebration(999).length).toBeGreaterThan(0);
  });
});
