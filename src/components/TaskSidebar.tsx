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
import { CalendarClock, Check, ChevronDown, ChevronRight, Trash2, Undo2 } from "lucide-react";

/**
 * The Backlog: create tasks, mark them done, and schedule them onto the grid —
 * by dragging a card onto the calendar (desktop) or arming a task and tapping
 * a slot (touch fallback; works with a mouse too).
 */
export function TaskSidebar({
  tasks,
  armedTaskId,
  onAdd,
  onToggleDone,
  onDelete,
  onArm,
}: {
  tasks: TaskRecord[];
  armedTaskId: string | null;
  onAdd: (title: string) => void;
  onToggleDone: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  onArm: (taskId: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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
      <h2 className="text-sm font-semibold">Tasks</h2>
      <form onSubmit={submit}>
        <Input
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </form>

      {armedTaskId && (
        <p className="rounded-md bg-accent px-2 py-1.5 text-xs text-accent-foreground">
          Tap a calendar slot to place the block —{" "}
          <button className="underline" onClick={() => onArm(null)}>
            cancel
          </button>
        </p>
      )}

      <div ref={listRef} className="flex flex-col gap-1.5">
        {open.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No open tasks. Add one above, then drag it onto the calendar.
          </p>
        )}
        {open.map((t) => (
          <div
            key={t.id}
            data-task-id={t.id}
            data-task-title={t.title}
            className={cn(
              "group flex cursor-grab items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-sm shadow-xs",
              armedTaskId === t.id && "ring-2 ring-ring",
            )}
          >
            <span className="min-w-0 flex-1 truncate" title={t.title}>
              {t.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title="Schedule: tap here, then tap a calendar slot"
              onClick={() => onArm(armedTaskId === t.id ? null : t.id)}
            >
              <CalendarClock />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title="Mark done"
              onClick={() => onToggleDone(t)}
            >
              <Check />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-destructive"
              title="Delete task (removes its blocks)"
              onClick={() => onDelete(t)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <Collapsible
          open={showDone}
          onOpenChange={setShowDone}
          className="flex flex-col gap-1.5"
        >
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {showDone ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Done ({done.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-1.5">
            {done.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5 text-sm text-muted-foreground"
              >
                <span className="min-w-0 flex-1 truncate line-through" title={t.title}>
                  {t.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  title="Reopen"
                  onClick={() => onToggleDone(t)}
                >
                  <Undo2 />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-destructive"
                  title="Delete task (removes its blocks)"
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
