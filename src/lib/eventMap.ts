import type { EventInput } from "@fullcalendar/core";
import type { EventRecord, TaskRecord } from "@/lib/pb";

// PocketBase stores UTC strings like "2026-07-20 09:00:00.000Z" (space, not
// `T`). Swapping the space for a `T` yields a valid ISO string; FullCalendar
// parses it and renders in the browser's local zone.
function pbToISO(pbDate: string): string {
  return pbDate.replace(" ", "T");
}

/**
 * Maps a PB event row to a FullCalendar event. Rows with a `task` relation are
 * TimeBlocks: title derives from the task, and styling reflects the task's
 * done state (block stays on the grid, muted — see the block-visuals decision).
 */
export function pbToFc(
  r: EventRecord,
  tasksById: Map<string, TaskRecord>,
): EventInput {
  const task = r.task ? tasksById.get(r.task) : undefined;
  return {
    id: r.id,
    title: task ? task.title : r.title,
    start: pbToISO(r.start),
    end: r.end ? pbToISO(r.end) : undefined,
    allDay: r.all_day,
    classNames: task ? ["fc-task-block", ...(task.done ? ["fc-task-done"] : [])] : [],
    extendedProps: {
      description: r.description,
      taskId: r.task || null,
    },
  };
}

/** Local wall-clock Date -> value for an <input type="datetime-local">. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local Date -> value for an <input type="date">. */
export function toLocalDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
