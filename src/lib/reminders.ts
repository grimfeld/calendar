import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  pending,
  cancel,
  Schedule,
} from "@tauri-apps/plugin-notification";
import type { EventRecord, TaskRecord } from "@/lib/pb";

export interface Reminder {
  /** Stable numeric id for the OS scheduler (hash of event id). */
  id: number;
  title: string;
  body: string;
  fireAt: Date;
}

export const isTauri = () => "__TAURI_INTERNALS__" in window;
export const isAndroid = () => /android/i.test(navigator.userAgent);

/** All-day items with a reminder notify at 09:00 local on their day. */
const ALL_DAY_HOUR = 9;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Upcoming reminders from the event set: every event/TimeBlock with a
 * non-zero `reminder` offset, skipping blocks whose task is done.
 */
export function computeReminders(
  events: EventRecord[],
  tasksById: Map<string, TaskRecord>,
  now: Date,
): Reminder[] {
  const out: Reminder[] = [];
  for (const r of events) {
    if (!r.reminder || !r.start) continue;
    const task = r.task ? tasksById.get(r.task) : undefined;
    if (r.task && (!task || task.done)) continue;

    const start = new Date(r.start.replace(" ", "T"));
    const fireAt = r.all_day
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate(), ALL_DAY_HOUR)
      : new Date(start.getTime() - r.reminder * 60_000);
    if (fireAt <= now) continue;

    const title = task ? task.title : r.title;
    out.push({
      id: hashId(r.id),
      title,
      body: r.all_day
        ? "All day today"
        : `${task ? "Work session at" : "Starts at"} ${timeFmt.format(start)}`,
      fireAt,
    });
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

export async function ensurePermission(): Promise<boolean> {
  if (isTauri()) {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
}

function notifyNow(title: string, body: string) {
  if (isTauri()) {
    sendNotification({ title, body });
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** In-app timer chain: fires while the app is running (desktop + browser). */
function armTimer(reminders: Reminder[]) {
  clearTimeout(timer);
  const [next, ...rest] = reminders;
  if (!next) return;
  timer = setTimeout(
    () => {
      // Fire everything due within the same minute in one go.
      const cutoff = next.fireAt.getTime() + 60_000;
      const due = [next, ...rest.filter((r) => r.fireAt.getTime() < cutoff)];
      for (const r of due) notifyNow(r.title, r.body);
      armTimer(rest.filter((r) => r.fireAt.getTime() >= cutoff));
    },
    Math.min(next.fireAt.getTime() - Date.now(), 2 ** 31 - 1),
  );
}

/** Android: replace all OS-scheduled notifications so they fire app-closed. */
async function syncAndroidSchedule(reminders: Reminder[]) {
  try {
    const p = await pending();
    if (p.length) await cancel(p.map((n) => n.id));
    for (const r of reminders.slice(0, 50)) {
      await sendNotification({
        id: r.id,
        title: r.title,
        body: r.body,
        schedule: Schedule.at(r.fireAt),
      });
    }
  } catch (e) {
    console.warn("reminder scheduling failed", e);
  }
}

/**
 * Reconcile alerts with the current data. Call after every fetch/mutation.
 * Android relies on OS scheduling (fires app-closed); elsewhere an in-app
 * timer covers the app-running case.
 */
export async function syncReminders(
  events: EventRecord[],
  tasksById: Map<string, TaskRecord>,
) {
  const upcoming = computeReminders(events, tasksById, new Date());
  if (isTauri() && isAndroid()) {
    await syncAndroidSchedule(upcoming);
  } else {
    armTimer(upcoming);
  }
}
