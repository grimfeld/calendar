import PocketBase from "pocketbase";

// Per ticket 04: identical URL on desktop and Android (the phone reaches the
// Mac's PocketBase via `adb reverse tcp:8090 tcp:8090`), so no per-platform
// branch is needed. Override with VITE_PB_URL if ever using a non-loopback host.
export const PB_URL: string =
  import.meta.env.VITE_PB_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(PB_URL);

// The app has no login (personal, public API rules), and React StrictMode
// double-invokes effects in dev — disable auto-cancellation so the duplicate
// list request isn't aborted.
pb.autoCancellation(false);

/** An `events` record as returned by PocketBase (see ticket 02 schema). */
export interface EventRecord {
  id: string;
  title: string;
  /** PB date string, e.g. "2026-07-20 09:00:00.000Z" (space, not `T`). Empty "" if unset. */
  start: string;
  end: string;
  all_day: boolean;
  description: string;
  created: string;
}

/** Fields the app writes when creating an event. */
export interface NewEvent {
  title: string;
  start: string;
  end?: string;
  all_day?: boolean;
  description?: string;
}

export function listEvents(): Promise<EventRecord[]> {
  return pb.collection("events").getFullList<EventRecord>({ sort: "start" });
}

export function createEvent(data: NewEvent): Promise<EventRecord> {
  return pb.collection("events").create<EventRecord>(data);
}
