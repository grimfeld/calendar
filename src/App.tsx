import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarView, type EventTimeChange } from "@/components/CalendarView";
import { TaskSidebar } from "@/components/TaskSidebar";
import { EventDialog, type EventDraft, type EventSubmit } from "@/components/EventDialog";
import { BlockDialog } from "@/components/BlockDialog";
import { pbToFc } from "@/lib/eventMap";
import {
  PB_URL,
  createEvent,
  createTask,
  deleteEvent,
  deleteTask,
  isAuthError,
  isAuthed,
  listEvents,
  listTasks,
  logout,
  onAuthChange,
  updateEvent,
  updateTask,
  type EventRecord,
  type TaskRecord,
} from "@/lib/pb";
import { LoginScreen } from "@/components/LoginScreen";
import { LockScreen } from "@/components/LockScreen";
import { TaskDialog, type TaskSubmit } from "@/components/TaskDialog";
import { biometricAvailable } from "@/lib/biometric";
import { shouldReopen } from "@/lib/recurrence";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ensurePermission, syncReminders } from "@/lib/reminders";
import { writeWidgetAgenda } from "@/lib/widgetAgenda";
import { LogOut, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";

/** Google-style default: new events and blocks remind 10 minutes before. */
const DEFAULT_REMINDER = 10;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function App() {
  const [authed, setAuthed] = useState(isAuthed);
  // Biometric gate over a restored session: null = checking availability.
  const [locked, setLocked] = useState<boolean | null>(isAuthed() ? null : false);
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // Collapsed by default on phone-width screens (Android); open on desktop.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );
  const [armedTaskId, setArmedTaskId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<TaskRecord | null>(null);

  const refetch = useCallback(async () => {
    try {
      let [evs, tks] = await Promise.all([listEvents(), listTasks()]);
      // Recurring tasks completed in a previous period come due again.
      const reopen = tks.filter((t) => shouldReopen(t, new Date()));
      if (reopen.length) {
        await Promise.all(
          reopen.map((t) => updateTask(t.id, { done: false, done_on: "" })),
        );
        tks = await listTasks();
      }
      setEvents(evs);
      setTasks(tks);
      setError(null);
    } catch (e) {
      // Expired/invalid session -> back to the login screen.
      if (isAuthError(e)) {
        logout();
        return;
      }
      setError(String(e));
    }
  }, []);

  useEffect(
    () =>
      onAuthChange(() => {
        const now = isAuthed();
        setAuthed(now);
        // A fresh password login is itself proof of presence — don't
        // immediately re-lock behind biometrics.
        if (!now) setLocked(false);
      }),
    [],
  );

  // On startup with a restored session, gate behind biometrics when available.
  useEffect(() => {
    if (locked !== null) return;
    biometricAvailable().then((avail) => setLocked(avail));
  }, [locked]);

  useEffect(() => {
    if (!authed || locked !== false) {
      setEvents(null);
      setTasks(null);
      return;
    }
    ensurePermission();
    refetch();
  }, [authed, locked, refetch]);

  const tasksById = useMemo(
    () => new Map((tasks ?? []).map((t) => [t.id, t])),
    [tasks],
  );

  // Keep alerts and the Android widget in sync with the data.
  useEffect(() => {
    if (!events) return;
    syncReminders(events, tasksById);
    writeWidgetAgenda(events, tasksById);
  }, [events, tasksById]);
  const fcEvents = useMemo(
    () => (events ?? []).map((r) => pbToFc(r, tasksById)),
    [events, tasksById],
  );

  // Tasks with an upcoming TimeBlock — shown muted in the Backlog.
  const scheduledTaskIds = useMemo(() => {
    const now = Date.now();
    const ids = new Set<string>();
    for (const r of events ?? []) {
      if (!r.task) continue;
      const edge = new Date((r.end || r.start).replace(" ", "T")).getTime();
      if (edge >= now) ids.add(r.task);
    }
    return ids;
  }, [events]);

  /** Wraps a PB mutation: run, refetch, surface errors. */
  async function mutate(fn: () => Promise<unknown>) {
    try {
      await fn();
      await refetch();
      setError(null);
      return true;
    } catch (e) {
      if (isAuthError(e)) {
        logout();
        return false;
      }
      setError(String(e));
      return false;
    }
  }

  // ---- Scheduling (TimeBlocks) ----

  function createBlock(taskId: string, start: Date, allDay: boolean) {
    const task = tasksById.get(taskId);
    if (!task) return;
    mutate(() =>
      createEvent({
        // Denormalised copy — display always derives from the task (ADR 0001).
        title: task.title,
        start: start.toISOString(),
        end: allDay ? undefined : new Date(start.getTime() + HOUR_MS).toISOString(),
        all_day: allDay,
        task: taskId,
        reminder: DEFAULT_REMINDER,
      }),
    );
  }

  function handleDateClick(date: Date, allDay: boolean) {
    if (armedTaskId) {
      createBlock(armedTaskId, date, allDay);
      setArmedTaskId(null);
      return;
    }
    // Touch taps don't produce a drag-selection (FullCalendar requires a
    // long-press for that), so on mobile a plain tap opens quick-create.
    if (isMobile) {
      setEventDraft({
        title: "",
        start: date,
        end: allDay ? date : new Date(date.getTime() + HOUR_MS),
        allDay,
        description: "",
        reminder: DEFAULT_REMINDER,
      });
    }
  }

  function handleExternalDrop(taskId: string, start: Date, allDay: boolean) {
    createBlock(taskId, start, allDay);
  }

  // ---- Events ----

  /** "New event" button: quick-create starting at the next full hour. */
  function openNewEvent() {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setTime(start.getTime() + HOUR_MS);
    setEventDraft({
      title: "",
      start,
      end: new Date(start.getTime() + HOUR_MS),
      allDay: false,
      description: "",
      reminder: DEFAULT_REMINDER,
    });
  }

  function handleSelectRange(start: Date, end: Date, allDay: boolean) {
    // When a task is armed, placement happens in dateClick — don't also open
    // the quick-create for the same click.
    if (armedTaskId) return;
    setEventDraft({
      title: "",
      start,
      // FullCalendar's all-day end is exclusive; the form shows inclusive dates.
      end: allDay ? new Date(end.getTime() - DAY_MS) : end,
      allDay,
      description: "",
      reminder: DEFAULT_REMINDER,
    });
  }

  function handleEventClick(id: string) {
    const record = (events ?? []).find((r) => r.id === id);
    if (!record) return;
    if (record.task) {
      setOpenBlockId(id);
      return;
    }
    const start = new Date(record.start.replace(" ", "T"));
    const end = record.end ? new Date(record.end.replace(" ", "T")) : null;
    setEventDraft({
      id: record.id,
      title: record.title,
      start,
      end: record.all_day && end ? new Date(end.getTime() - DAY_MS) : end,
      allDay: record.all_day,
      description: record.description,
      reminder: record.reminder ?? 0,
    });
  }

  async function handleEventSubmit(id: string | undefined, data: EventSubmit) {
    const payload = {
      title: data.title,
      start: data.start.toISOString(),
      end: data.end
        ? new Date(data.end.getTime() + (data.allDay ? DAY_MS : 0)).toISOString()
        : "",
      all_day: data.allDay,
      description: data.description,
      reminder: data.reminder,
    };
    const ok = await mutate(() =>
      id ? updateEvent(id, payload) : createEvent(payload),
    );
    if (ok) setEventDraft(null);
  }

  async function handleEventDelete(id: string) {
    const ok = await mutate(() => deleteEvent(id));
    if (ok) setEventDraft(null);
  }

  async function handleEventTimeChange(change: EventTimeChange) {
    try {
      await updateEvent(change.id, {
        start: change.start.toISOString(),
        end: change.end ? change.end.toISOString() : "",
        all_day: change.allDay,
      });
      await refetch();
      setError(null);
    } catch (e) {
      change.revert();
      setError(String(e));
    }
  }

  // ---- Tasks ----

  function handleToggleDone(task: TaskRecord) {
    const done = !task.done;
    mutate(() =>
      updateTask(task.id, {
        done,
        done_on: done ? new Date().toISOString() : "",
      }),
    );
  }

  async function handleTaskSubmit(id: string, data: TaskSubmit) {
    const ok = await mutate(() => updateTask(id, data));
    if (ok) setEditTask(null);
  }

  function handleDeleteTask(task: TaskRecord) {
    if (!window.confirm(`Supprimer la tâche « ${task.title} » et ses blocs du calendrier ?`))
      return;
    mutate(() => deleteTask(task.id));
  }

  async function handleUnschedule(blockId: string) {
    const ok = await mutate(() => deleteEvent(blockId));
    if (ok) setOpenBlockId(null);
  }

  if (!authed) return <LoginScreen />;
  if (locked !== false)
    return locked === null ? null : (
      <LockScreen
        onUnlock={() => setLocked(false)}
        onUsePassword={logout}
      />
    );

  const openBlock = openBlockId
    ? ((events ?? []).find((r) => r.id === openBlockId) ?? null)
    : null;
  const openBlockTask = openBlock?.task
    ? (tasksById.get(openBlock.task) ?? null)
    : null;

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          title={sidebarOpen ? "Masquer les tâches" : "Afficher les tâches"}
          onClick={() => setSidebarOpen((s) => !s)}
        >
          {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
        <h1 className="text-lg font-semibold">Calendrier</h1>
        <p className="text-xs text-muted-foreground">{PB_URL}</p>
        {!isMobile && (
          <Button size="sm" onClick={openNewEvent}>
            <Plus />
            Nouvel événement
          </Button>
        )}
        {error && (
          <p className="ml-auto max-w-96 truncate text-sm text-destructive" title={error}>
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={error ? "" : "ml-auto"}
          title="Se déconnecter"
          onClick={logout}
        >
          <LogOut />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {(() => {
          const sidebar = (
            <TaskSidebar
              tasks={tasks ?? []}
              armedTaskId={armedTaskId}
              scheduledTaskIds={scheduledTaskIds}
              onAdd={(title) => mutate(() => createTask({ title }))}
              onEdit={setEditTask}
              onToggleDone={handleToggleDone}
              onDelete={handleDeleteTask}
              onArm={(taskId) => {
                setArmedTaskId(taskId);
                // On mobile the backlog covers the grid — close it so the
                // armed tap can land on a calendar slot.
                if (isMobile && taskId) setSidebarOpen(false);
              }}
            />
          );
          return isMobile ? (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent
                side="left"
                className="w-72 gap-0 p-0"
                // Don't autofocus the add-task input — it pops the soft
                // keyboard the moment the sheet opens on mobile.
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Tâches</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
          ) : (
            sidebarOpen && (
              <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
                {sidebar}
              </aside>
            )
          );
        })()}
        <div className="min-w-0 flex-1 p-3">
          {events === null ? (
            <p className="text-sm text-muted-foreground">Chargement des événements…</p>
          ) : (
            <CalendarView
              mobile={isMobile}
              events={fcEvents}
              onSelectRange={handleSelectRange}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onEventTimeChange={handleEventTimeChange}
              onExternalDrop={handleExternalDrop}
            />
          )}
        </div>
      </div>

      {isMobile && (
        <Button
          size="icon"
          className="fixed right-5 bottom-6 z-40 size-14 rounded-full shadow-lg"
          title="Nouvel événement"
          onClick={openNewEvent}
        >
          <Plus className="size-6" />
        </Button>
      )}

      <TaskDialog
        task={editTask}
        onSubmit={handleTaskSubmit}
        onClose={() => setEditTask(null)}
      />
      <EventDialog
        draft={eventDraft}
        onSubmit={handleEventSubmit}
        onDelete={handleEventDelete}
        onClose={() => setEventDraft(null)}
      />
      <BlockDialog
        block={openBlock}
        task={openBlockTask}
        onToggleDone={handleToggleDone}
        onUnschedule={handleUnschedule}
        onChangeReminder={(blockId, minutes) =>
          mutate(() => updateEvent(blockId, { reminder: minutes }))
        }
        onClose={() => setOpenBlockId(null)}
      />
    </main>
  );
}

export default App;
