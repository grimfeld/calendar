import FullCalendar from "@fullcalendar/react";
import type { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export interface EventTimeChange {
  id: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  revert: () => void;
}

/**
 * The calendar grid. Purely presentational: data and mutations live in App.
 * Google-style interactions: drag a range to create, drag/resize to move,
 * click for details, and drop a task card from the sidebar to schedule it.
 */
export function CalendarView({
  mobile,
  events,
  onSelectRange,
  onDateClick,
  onEventClick,
  onEventTimeChange,
  onExternalDrop,
}: {
  mobile: boolean;
  events: EventInput[];
  onSelectRange: (start: Date, end: Date, allDay: boolean) => void;
  onDateClick: (date: Date, allDay: boolean) => void;
  onEventClick: (id: string) => void;
  onEventTimeChange: (change: EventTimeChange) => void;
  onExternalDrop: (taskId: string, start: Date, allDay: boolean) => void;
}) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView={mobile ? "timeGridDay" : "timeGridWeek"}
      firstDay={1}
      headerToolbar={{
        left: "prev,next today",
        center: mobile ? "" : "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      }}
      dayHeaderFormat={
        mobile
          ? { weekday: "short", day: "numeric" }
          : { weekday: "short", month: "numeric", day: "numeric", omitCommas: true }
      }
      height="100%"
      nowIndicator
      dayMaxEvents
      events={events}
      selectable
      selectMirror
      select={(info) => onSelectRange(info.start, info.end, info.allDay)}
      dateClick={(info) => {
        // Clear the click's own slot-selection highlight before armed placement.
        info.view.calendar.unselect();
        onDateClick(info.date, info.allDay);
      }}
      eventClick={(info) => onEventClick(info.event.id)}
      editable
      eventDrop={(info) =>
        onEventTimeChange({
          id: info.event.id,
          start: info.event.start!,
          end: info.event.end,
          allDay: info.event.allDay,
          revert: info.revert,
        })
      }
      eventResize={(info) =>
        onEventTimeChange({
          id: info.event.id,
          start: info.event.start!,
          end: info.event.end,
          allDay: info.event.allDay,
          revert: info.revert,
        })
      }
      droppable
      eventReceive={(info) => {
        // A task card dropped from the sidebar. FullCalendar has already added
        // a temporary event — remove it; the real TimeBlock arrives via the
        // PB round-trip and refetch.
        const taskId = info.event.extendedProps.taskId as string;
        const start = info.event.start!;
        const allDay = info.event.allDay;
        info.event.remove();
        onExternalDrop(taskId, start, allDay);
      }}
    />
  );
}
