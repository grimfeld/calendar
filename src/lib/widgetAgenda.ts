import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { isAndroid, isTauri } from "@/lib/reminders";
import type { EventRecord, TaskRecord } from "@/lib/pb";

const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Writes today's agenda to a JSON file in the app data dir. The Android
 * home-screen widget (AgendaWidget.kt) renders from this file — the widget
 * can't run JS or reach PocketBase, so the app keeps the file fresh on every
 * data change.
 */
export async function writeWidgetAgenda(
  events: EventRecord[],
  tasksById: Map<string, TaskRecord>,
) {
  if (!isTauri() || !isAndroid()) return;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const items = events
    .map((r) => {
      const task = r.task ? tasksById.get(r.task) : undefined;
      if (r.task && !task) return null;
      const start = new Date(r.start.replace(" ", "T"));
      const end = r.end ? new Date(r.end.replace(" ", "T")) : null;
      // Today's items: start today, or a multi-day/all-day range spanning today.
      const spansToday =
        start < dayEnd && (end ? end > dayStart : start >= dayStart);
      if (!spansToday) return null;
      return {
        title: task ? task.title : r.title,
        time: r.all_day
          ? "Journée"
          : `${timeFmt.format(start)}${end ? " – " + timeFmt.format(end) : ""}`,
        isTask: !!r.task,
        done: task?.done ?? false,
        sort: r.all_day ? 0 : start.getTime(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.sort - b.sort);

  try {
    await writeTextFile(
      "widget-agenda.json",
      JSON.stringify({ date: dayStart.toDateString(), items }),
      { baseDir: BaseDirectory.AppData },
    );
  } catch (e) {
    console.warn("widget agenda write failed", e);
  }
}
