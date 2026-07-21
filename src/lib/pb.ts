import PocketBase from "pocketbase";

// Per ticket 04: identical URL on desktop and Android (the phone reaches the
// host's PocketBase via `adb reverse tcp:8090 tcp:8090`), so no per-platform
// branch is needed. Override with VITE_PB_URL if ever using a non-loopback host.
export const PB_URL: string =
  import.meta.env.VITE_PB_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(PB_URL);

// React StrictMode double-invokes effects in dev — disable auto-cancellation
// so the duplicate list request isn't aborted.
pb.autoCancellation(false);

// ---- Auth (single personal account in PB's built-in `users` collection).
// The SDK persists the session in localStorage; API rules require a valid
// token for every operation.

export function isAuthed(): boolean {
  return pb.authStore.isValid;
}

export function login(email: string, password: string) {
  return pb.collection("users").authWithPassword(email, password);
}

export function logout() {
  pb.authStore.clear();
}

/** Subscribe to auth state changes; returns an unsubscribe fn. */
export function onAuthChange(cb: () => void): () => void {
  return pb.authStore.onChange(cb);
}

/** True when an error means our session is invalid/expired. */
export function isAuthError(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  return status === 401 || status === 403;
}

/**
 * An `events` record as returned by PocketBase. A row with a non-empty `task`
 * is a TimeBlock — a scheduled session of that task (docs/adr/0001); its
 * display title derives from the task, not from `title`.
 */
export interface EventRecord {
  id: string;
  title: string;
  /** PB date string, e.g. "2026-07-20 09:00:00.000Z" (space, not `T`). Empty "" if unset. */
  start: string;
  end: string;
  all_day: boolean;
  description: string;
  /** Task id if this row is a TimeBlock, "" otherwise. */
  task: string;
  /** Minutes before start to notify; 0 = no reminder. All-day: notifies at 09:00. */
  reminder: number;
  /** Standalone time reservation (travel, break) — not a real event, no task. */
  blocker: boolean;
  created: string;
}

/** A `tasks` record — a Backlog item. Carries no time of its own. */
export interface TaskRecord {
  id: string;
  title: string;
  notes: string;
  done: boolean;
  /** "" | "daily" | "weekly" | "monthly" — reopens each period (recurrence.ts). */
  repeat: string;
  /** PB date string of the last completion; "" if never/open. */
  done_on: string;
  created: string;
}

/** Fields the app writes when creating an event (or TimeBlock, via `task`). */
export interface NewEvent {
  title: string;
  start: string;
  end?: string;
  all_day?: boolean;
  description?: string;
  task?: string;
  reminder?: number;
  blocker?: boolean;
}

export function listEvents(): Promise<EventRecord[]> {
  return pb.collection("events").getFullList<EventRecord>({ sort: "start" });
}

export function createEvent(data: NewEvent): Promise<EventRecord> {
  return pb.collection("events").create<EventRecord>(data);
}

export function updateEvent(
  id: string,
  data: Partial<NewEvent>,
): Promise<EventRecord> {
  return pb.collection("events").update<EventRecord>(id, data);
}

export function deleteEvent(id: string): Promise<boolean> {
  return pb.collection("events").delete(id);
}

export function listTasks(): Promise<TaskRecord[]> {
  return pb.collection("tasks").getFullList<TaskRecord>({ sort: "-created" });
}

export function createTask(data: {
  title: string;
  notes?: string;
}): Promise<TaskRecord> {
  return pb.collection("tasks").create<TaskRecord>(data);
}

export function updateTask(
  id: string,
  data: Partial<{
    title: string;
    notes: string;
    done: boolean;
    repeat: string;
    done_on: string;
  }>,
): Promise<TaskRecord> {
  return pb.collection("tasks").update<TaskRecord>(id, data);
}

/** Cascade-deletes the task's TimeBlocks (relation is cascadeDelete). */
export function deleteTask(id: string): Promise<boolean> {
  return pb.collection("tasks").delete(id);
}
