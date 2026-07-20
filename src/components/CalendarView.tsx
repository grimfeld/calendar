import { useEffect, useState } from "react";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import type { CalendarEventExternal } from "@schedule-x/calendar";
import {
  createViewMonthGrid,
  createViewWeek,
  createViewDay,
} from "@schedule-x/calendar";
import "@schedule-x/theme-shadcn/dist/index.css";
import { listEvents } from "@/lib/pb";
import { pbToScheduleX } from "@/lib/eventMap";

// Created only once events are loaded, so they can be passed directly into
// useCalendarApp. Remounted (via key) when the event set changes after a create.
function CalendarInner({ events }: { events: CalendarEventExternal[] }) {
  const calendar = useCalendarApp({
    views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
    defaultView: "month-grid",
    events,
  });
  return <ScheduleXCalendar calendarApp={calendar} />;
}

/** Fetches events from PocketBase and renders them on the Schedule-X grid. */
export function CalendarView({
  reloadKey,
  onError,
}: {
  reloadKey: number;
  onError: (msg: string) => void;
}) {
  const [events, setEvents] = useState<CalendarEventExternal[] | null>(null);
  // Bumped AFTER each fetch resolves. Keying the calendar on this (not on
  // reloadKey) guarantees the remount carries the freshly-fetched events —
  // useCalendarApp only reads events at mount, so events + key must change
  // together.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    listEvents()
      .then((recs) => {
        if (!alive) return;
        setEvents(recs.map(pbToScheduleX));
        setVersion((v) => v + 1);
      })
      .catch((e) => onError(String(e)));
    return () => {
      alive = false;
    };
  }, [reloadKey, onError]);

  if (!events) {
    return <p className="text-sm text-muted-foreground">Loading events…</p>;
  }

  return <CalendarInner key={version} events={events} />;
}
