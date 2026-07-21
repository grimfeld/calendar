import { useEffect, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskRecord } from "@/lib/pb";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Repeat,
  Trash2,
  Undo2,
} from "lucide-react";

const REPEAT_LABEL: Record<string, string> = {
  daily: "quotidien",
  weekly: "hebdo",
  monthly: "mensuel",
};

/** Draggable time reservations not linked to a task (see events.blocker). */
export interface BlockerPreset {
  title: string;
  minutes: number;
}

const BLOCKER_PRESETS: BlockerPreset[] = [
  { title: "Trajet", minutes: 30 },
  { title: "Pause", minutes: 15 },
  { title: "Indisponible", minutes: 60 },
];

const toDuration = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * The Backlog: create tasks, mark them done, and schedule them onto the grid —
 * by dragging a card onto the calendar (desktop) or arming a task and tapping
 * a slot (touch fallback; works with a mouse too).
 */
export function TaskSidebar({
  tasks,
  armedTaskId,
  armedBlocker,
  scheduledTaskIds,
  onAdd,
  onEdit,
  onToggleDone,
  onDelete,
  onArm,
  onArmBlocker,
}: {
  tasks: TaskRecord[];
  armedTaskId: string | null;
  armedBlocker: BlockerPreset | null;
  /** Tasks with at least one upcoming TimeBlock — rendered muted. */
  scheduledTaskIds: Set<string>;
  onAdd: (title: string) => void;
  onEdit: (task: TaskRecord) => void;
  onToggleDone: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  onArm: (taskId: string | null) => void;
  onArmBlocker: (preset: BlockerPreset | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const blockersRef = useRef<HTMLDivElement>(null);

  // Register open-task cards as FullCalendar external drag sources. The
  // calendar's eventReceive callback reads taskId back out of the event data.
  useEffect(() => {
    if (!listRef.current) return;
    const draggable = new Draggable(listRef.current, {
      itemSelector: "[data-task-id]",
      eventData: (el) => ({
        title: el.getAttribute("data-task-title") ?? "",
        duration: "01:00",
        extendedProps: { taskId: el.getAttribute("data-task-id") },
      }),
    });
    return () => draggable.destroy();
  }, []);

  // Blocker presets drag onto the grid too; eventReceive routes on
  // blockerTitle instead of taskId.
  useEffect(() => {
    if (!blockersRef.current) return;
    const draggable = new Draggable(blockersRef.current, {
      itemSelector: "[data-blocker-title]",
      eventData: (el) => {
        const minutes = Number(el.getAttribute("data-blocker-minutes"));
        return {
          title: el.getAttribute("data-blocker-title") ?? "",
          duration: toDuration(minutes),
          extendedProps: {
            blockerTitle: el.getAttribute("data-blocker-title"),
            blockerMinutes: minutes,
          },
        };
      },
    });
    return () => draggable.destroy();
  }, []);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <h2 className="text-sm font-semibold">Tâches</h2>
      <form onSubmit={submit}>
        <Input
          placeholder="Ajouter une tâche…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </form>

      {(armedTaskId || armedBlocker) && (
        <p className="rounded-md bg-accent px-2 py-1.5 text-xs text-accent-foreground">
          Touchez un créneau du calendrier pour placer{" "}
          {armedBlocker ? `« ${armedBlocker.title} »` : "le bloc"} —{" "}
          <button
            className="underline"
            onClick={() => {
              onArm(null);
              onArmBlocker(null);
            }}
          >
            annuler
          </button>
        </p>
      )}

      <div ref={listRef} className="flex flex-col gap-1.5">
        {open.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucune tâche ouverte. Ajoutez-en une ci-dessus, puis glissez-la sur
            le calendrier.
          </p>
        )}
        {open.map((t) => (
          <div
            key={t.id}
            data-task-id={t.id}
            data-task-title={t.title}
            className={cn(
              "group flex cursor-grab flex-col gap-1 rounded-md border bg-card px-2 py-1.5 text-sm shadow-xs",
              armedTaskId === t.id && "ring-2 ring-ring",
              // Already on the calendar -> visually parked.
              scheduledTaskIds.has(t.id) && "opacity-50",
            )}
          >
            <button
              type="button"
              className="w-full text-left leading-snug break-words"
              title="Toucher pour modifier"
              onClick={() => onEdit(t)}
            >
              {t.title}
            </button>
            <div className="flex items-center gap-1.5">
              {t.repeat && (
                <span
                  className="flex shrink-0 items-center gap-0.5 rounded-sm bg-accent px-1 py-0.5 text-[10px] font-medium text-accent-foreground"
                  title={`Se répète : ${REPEAT_LABEL[t.repeat] ?? t.repeat}`}
                >
                  <Repeat className="size-2.5" />
                  {REPEAT_LABEL[t.repeat] ?? t.repeat}
                </span>
              )}
              <div className="ml-auto flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  title="Planifier : touchez ici, puis un créneau du calendrier"
                  onClick={() => onArm(armedTaskId === t.id ? null : t.id)}
                >
                  <CalendarClock />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  title="Marquer comme faite"
                  onClick={() => onToggleDone(t)}
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-destructive"
                  title="Supprimer la tâche (retire ses blocs)"
                  onClick={() => onDelete(t)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-sm font-semibold">Bloqueurs</h2>
        <p className="text-xs text-muted-foreground">
          Réservations de temps sans tâche (trajet, pause…) — glissez-les sur
          le calendrier.
        </p>
        <div ref={blockersRef} className="flex flex-wrap gap-1.5">
          {BLOCKER_PRESETS.map((b) => (
            <button
              key={b.title}
              type="button"
              data-blocker-title={b.title}
              data-blocker-minutes={b.minutes}
              className={cn(
                "cursor-grab rounded-md border border-dashed bg-muted/50 px-2 py-1 text-xs shadow-xs",
                armedBlocker?.title === b.title && "ring-2 ring-ring",
              )}
              title="Glissez sur le calendrier, ou touchez ici puis un créneau"
              onClick={() =>
                onArmBlocker(armedBlocker?.title === b.title ? null : b)
              }
            >
              {b.title}{" "}
              <span className="text-muted-foreground">{b.minutes} min</span>
            </button>
          ))}
        </div>
      </div>

      {done.length > 0 && (
        <Collapsible
          open={showDone}
          onOpenChange={setShowDone}
          className="flex flex-col gap-1.5"
        >
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {showDone ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Terminées ({done.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-1.5">
            {done.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5 text-sm text-muted-foreground"
              >
                <span className="min-w-0 flex-1 leading-snug break-words line-through">
                  {t.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  title="Rouvrir"
                  onClick={() => onToggleDone(t)}
                >
                  <Undo2 />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-destructive"
                  title="Supprimer la tâche (retire ses blocs)"
                  onClick={() => onDelete(t)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
