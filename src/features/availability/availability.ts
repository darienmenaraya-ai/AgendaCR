export type WorkingInterval = {
  startTime: string;
  endTime: string;
};

export type BlockedInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type AvailableSlot = {
  startsAt: Date;
  endsAt: Date;
};

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type LocalDateTimeParts = LocalDateParts & {
  hour: number;
  minute: number;
  second: number;
};

const localTimeFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

export function getWeekdayForLocalDate(date: string): number {
  const parts = parseLocalDate(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function getLocalDateForInstant(
  date: Date,
  timeZone: string,
): string | null {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = localTimeFormatter(timeZone);
  } catch {
    return null;
  }

  const parts = getZonedParts(date.getTime(), formatter);
  if (!parts) return null;
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function parseLocalDateTimeForTimeZone(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  return localDateTimeToUtc(`${date}T${time}`, timeZone);
}

export function getUtcRangeForLocalDate(
  date: string,
  timeZone: string,
): { startsAt: Date; endsAt: Date } | null {
  const currentDate = parseLocalDate(date);
  const nextDate = new Date(
    Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day + 1),
  );
  const nextDateString = [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const startsAt = localDateTimeToUtc(`${date}T00:00`, timeZone);
  const endsAt = localDateTimeToUtc(`${nextDateString}T00:00`, timeZone);

  return startsAt && endsAt ? { startsAt, endsAt } : null;
}

export function calculateAvailability({
  date,
  timeZone,
  durationMinutes,
  workingIntervals,
  blockedIntervals,
  now = new Date(),
  intervalMinutes = 15,
  minimumLeadTimeMinutes = 60,
}: {
  date: string;
  timeZone: string;
  durationMinutes: number;
  workingIntervals: WorkingInterval[];
  blockedIntervals: BlockedInterval[];
  now?: Date;
  intervalMinutes?: number;
  minimumLeadTimeMinutes?: number;
}): AvailableSlot[] {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    !Number.isInteger(intervalMinutes) ||
    intervalMinutes <= 0 ||
    !Number.isInteger(minimumLeadTimeMinutes) ||
    minimumLeadTimeMinutes < 0
  ) {
    return [];
  }

  const earliestAllowed = now.getTime() + minimumLeadTimeMinutes * 60_000;
  const durationMs = durationMinutes * 60_000;
  const slots = new Map<number, AvailableSlot>();

  for (const interval of workingIntervals) {
    const localStart = localDateTimeToUtc(
      `${date}T${interval.startTime.slice(0, 5)}`,
      timeZone,
    );
    const localEnd = localDateTimeToUtc(
      `${date}T${interval.endTime.slice(0, 5)}`,
      timeZone,
    );
    if (!localStart || !localEnd || localStart >= localEnd) continue;

    const localStartEpoch = localDateTimeEpoch(date, interval.startTime);
    const localEndEpoch = localDateTimeEpoch(date, interval.endTime);
    if (localStartEpoch === null || localEndEpoch === null) continue;

    const firstCandidate =
      Math.ceil(localStartEpoch / (intervalMinutes * 60_000)) *
      intervalMinutes *
      60_000;

    for (
      let candidateLocalEpoch = firstCandidate;
      candidateLocalEpoch < localEndEpoch;
      candidateLocalEpoch += intervalMinutes * 60_000
    ) {
      const candidateParts = new Date(candidateLocalEpoch);
      const candidateLocal = `${formatLocalDate(candidateParts)}T${String(candidateParts.getUTCHours()).padStart(2, "0")}:${String(candidateParts.getUTCMinutes()).padStart(2, "0")}`;
      const startsAt = localDateTimeToUtc(candidateLocal, timeZone);
      if (!startsAt || startsAt.getTime() < earliestAllowed) continue;

      const endsAt = new Date(startsAt.getTime() + durationMs);
      if (endsAt > localEnd) continue;

      const overlapsBlockedInterval = blockedIntervals.some(
        (blocked) => startsAt < blocked.endsAt && endsAt > blocked.startsAt,
      );
      if (overlapsBlockedInterval) continue;

      slots.set(startsAt.getTime(), { startsAt, endsAt });
    }
  }

  return [...slots.values()].sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );
}

function parseLocalDate(date: string): LocalDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("La fecha debe usar el formato AAAA-MM-DD.");

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("La fecha indicada no existe.");
  }

  return { year, month, day };
}

function localDateTimeEpoch(date: string, time: string): number | null {
  const dateParts = parseLocalDate(date);
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    hour,
    minute,
  );
}

function localDateTimeToUtc(
  localDateTime: string,
  timeZone: string,
): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(localDateTime);
  if (!match) return null;

  const localEpoch = localDateTimeEpoch(match[1], match[2]);
  if (localEpoch === null) return null;

  let candidate = localEpoch;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = localTimeFormatter(timeZone);
  } catch {
    return null;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = getTimeZoneOffset(candidate, formatter);
    if (offset === null) return null;
    const adjustedCandidate = localEpoch - offset;
    if (adjustedCandidate === candidate) break;
    candidate = adjustedCandidate;
  }

  const actual = getZonedParts(candidate, formatter);
  const expected = expectedLocalParts(match[1], match[2]);
  if (!actual || !expected || !sameLocalMinute(actual, expected)) return null;

  return new Date(candidate);
}

function getTimeZoneOffset(
  epoch: number,
  formatter: Intl.DateTimeFormat,
): number | null {
  const parts = getZonedParts(epoch, formatter);
  if (!parts) return null;
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(epoch / 1_000) * 1_000;
}

function getZonedParts(
  epoch: number,
  formatter: Intl.DateTimeFormat,
): LocalDateTimeParts | null {
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(epoch))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  if (
    !values.year ||
    !values.month ||
    !values.day ||
    Number.isNaN(values.hour) ||
    Number.isNaN(values.minute) ||
    Number.isNaN(values.second)
  ) {
    return null;
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function expectedLocalParts(
  date: string,
  time: string,
): LocalDateTimeParts | null {
  const dateParts = parseLocalDate(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!timeMatch) return null;
  return {
    ...dateParts,
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  };
}

function sameLocalMinute(
  left: LocalDateTimeParts,
  right: LocalDateTimeParts,
): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  );
}

function formatLocalDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
