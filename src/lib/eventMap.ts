/// <reference types="temporal-polyfill/global" />
import type { CalendarEventExternal } from "@schedule-x/calendar";
import type { EventRecord } from "@/lib/pb";

// Uses the GLOBAL `Temporal` (installed in main.tsx via "temporal-polyfill/global")
// — the same one Schedule-X v4 checks against, so its instanceof guards pass.
//
// Schedule-X v4 takes Temporal objects (NOT the "YYYY-MM-DD HH:mm" strings of
// v2/v3): Temporal.ZonedDateTime for timed events, Temporal.PlainDate for
// all-day. PocketBase stores UTC strings like "2026-07-20 09:00:00.000Z"
// (space, not `T`, with a Z offset). We parse as an Instant and render in the
// local zone so the day/time shown matches what was entered.
const localTz = Temporal.Now.timeZoneId();

function toZoned(pbDate: string): Temporal.ZonedDateTime {
  // "2026-07-20 09:00:00.000Z" -> "2026-07-20T09:00:00.000Z" (a valid Instant)
  return Temporal.Instant.from(pbDate.replace(" ", "T")).toZonedDateTimeISO(
    localTz,
  );
}

export function pbToScheduleX(r: EventRecord): CalendarEventExternal {
  const startZ = toZoned(r.start);
  const endZ = r.end ? toZoned(r.end) : startZ;

  if (r.all_day) {
    return {
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      start: startZ.toPlainDate(),
      end: endZ.toPlainDate(),
    };
  }

  return {
    id: r.id,
    title: r.title,
    description: r.description || undefined,
    start: startZ,
    end: endZ,
  };
}
