import { describe, expect, it } from "vitest";

import {
  calculateAvailability,
  getLocalDateForInstant,
  getUtcRangeForLocalDate,
  getWeekdayForLocalDate,
  parseLocalDateTimeForTimeZone,
} from "../../src/features/availability/availability";

describe("calculateAvailability", () => {
  it("offers 15-minute slots that fit the service inside working hours", () => {
    const slots = calculateAvailability({
      date: "2026-11-23",
      timeZone: "America/Costa_Rica",
      durationMinutes: 30,
      workingIntervals: [{ startTime: "09:00:00", endTime: "10:00:00" }],
      blockedIntervals: [],
      now: new Date("2026-11-23T13:00:00.000Z"),
    });

    expect(slots.map(({ startsAt }) => startsAt.toISOString())).toEqual([
      "2026-11-23T15:00:00.000Z",
      "2026-11-23T15:15:00.000Z",
      "2026-11-23T15:30:00.000Z",
    ]);
    expect(
      slots.every(
        ({ endsAt }) => endsAt <= new Date("2026-11-23T16:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("removes slots that overlap appointments or time off", () => {
    const slots = calculateAvailability({
      date: "2026-11-23",
      timeZone: "America/Costa_Rica",
      durationMinutes: 30,
      workingIntervals: [{ startTime: "09:00", endTime: "11:00" }],
      blockedIntervals: [
        {
          startsAt: new Date("2026-11-23T15:15:00.000Z"),
          endsAt: new Date("2026-11-23T15:45:00.000Z"),
        },
      ],
      now: new Date("2026-11-23T13:00:00.000Z"),
    });

    expect(slots.map(({ startsAt }) => startsAt.toISOString())).toEqual([
      "2026-11-23T15:45:00.000Z",
      "2026-11-23T16:00:00.000Z",
      "2026-11-23T16:15:00.000Z",
      "2026-11-23T16:30:00.000Z",
    ]);
  });

  it("allows a slot to start exactly when a blocked interval ends", () => {
    const slots = calculateAvailability({
      date: "2026-11-23",
      timeZone: "America/Costa_Rica",
      durationMinutes: 30,
      workingIntervals: [{ startTime: "09:00", endTime: "10:00" }],
      blockedIntervals: [
        {
          startsAt: new Date("2026-11-23T15:00:00.000Z"),
          endsAt: new Date("2026-11-23T15:30:00.000Z"),
        },
      ],
      now: new Date("2026-11-23T13:00:00.000Z"),
    });

    expect(slots.map(({ startsAt }) => startsAt.toISOString())).toEqual([
      "2026-11-23T15:30:00.000Z",
    ]);
  });

  it("enforces the minimum lead time", () => {
    const slots = calculateAvailability({
      date: "2026-11-23",
      timeZone: "America/Costa_Rica",
      durationMinutes: 15,
      workingIntervals: [{ startTime: "09:00", endTime: "11:00" }],
      blockedIntervals: [],
      now: new Date("2026-11-23T15:20:00.000Z"),
    });

    expect(slots[0]?.startsAt.toISOString()).toBe("2026-11-23T16:30:00.000Z");
  });

  it("returns no slots for invalid durations or invalid time zones", () => {
    const input = {
      date: "2026-11-23",
      timeZone: "America/Costa_Rica",
      durationMinutes: 30,
      workingIntervals: [{ startTime: "09:00", endTime: "10:00" }],
      blockedIntervals: [],
      now: new Date("2026-11-23T13:00:00.000Z"),
    };

    expect(calculateAvailability({ ...input, durationMinutes: 0 })).toEqual([]);
    expect(
      calculateAvailability({ ...input, timeZone: "Not/A_Time_Zone" }),
    ).toEqual([]);
  });
});

describe("Costa Rica local date and time helpers", () => {
  it("converts a Costa Rica calendar day to its UTC range", () => {
    expect(getUtcRangeForLocalDate("2026-11-23", "America/Costa_Rica")).toEqual(
      {
        startsAt: new Date("2026-11-23T06:00:00.000Z"),
        endsAt: new Date("2026-11-24T06:00:00.000Z"),
      },
    );
  });

  it("converts instants and calculates weekdays in the requested time zone", () => {
    expect(
      getLocalDateForInstant(
        new Date("2026-11-23T05:30:00.000Z"),
        "America/Costa_Rica",
      ),
    ).toBe("2026-11-22");
    expect(getWeekdayForLocalDate("2026-11-23")).toBe(1);
  });

  it("rejects local times that do not exist during a daylight-saving jump", () => {
    expect(
      parseLocalDateTimeForTimeZone("2026-03-08", "02:30", "America/New_York"),
    ).toBeNull();
  });
});
