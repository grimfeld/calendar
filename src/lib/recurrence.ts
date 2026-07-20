import type { TaskRecord } from "@/lib/pb";

/**
 * Recurring tasks reopen at the start of the period after the one they were
 * completed in: daily -> midnight, weekly -> Monday 00:00, monthly -> the 1st.
 * All boundaries are local time; the sweep runs client-side on data load.
 */
export function periodStart(repeat: string, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (repeat === "weekly") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
  } else if (repeat === "monthly") {
    d.setDate(1);
  }
  return d;
}

/** Done in a previous period -> due again now. */
export function shouldReopen(task: TaskRecord, now: Date): boolean {
  if (!task.done || !task.repeat) return false;
  if (!task.done_on) return true;
  const doneOn = new Date(task.done_on.replace(" ", "T"));
  return doneOn < periodStart(task.repeat, now);
}

export const REPEAT_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};
