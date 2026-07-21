import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REMINDER_OPTIONS } from "@/components/EventDialog";
import type { EventRecord, TaskRecord } from "@/lib/pb";

/**
 * Details popup for a TimeBlock (a scheduled session of a task). Time changes
 * happen by dragging/resizing on the grid; here you toggle the task's done
 * state or unschedule this block.
 */
export function BlockDialog({
  block,
  task,
  onToggleDone,
  onUnschedule,
  onChangeReminder,
  onClose,
}: {
  block: EventRecord | null;
  task: TaskRecord | null;
  onToggleDone: (task: TaskRecord) => void;
  onUnschedule: (blockId: string) => void;
  onChangeReminder: (blockId: string, minutes: number) => void;
  onClose: () => void;
}) {
  if (!block || !task) return null;

  const fmt = (pbDate: string) =>
    pbDate
      ? new Date(pbDate.replace(" ", "T")).toLocaleString("fr-FR", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={task.done ? "line-through text-muted-foreground" : ""}>
            {task.title}
          </DialogTitle>
          <DialogDescription>
            Session de travail · {fmt(block.start)}
            {block.end ? ` – ${fmt(block.end)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {task.notes && <p className="text-sm text-muted-foreground">{task.notes}</p>}
        <div className="grid gap-1.5">
          <Label>Rappel</Label>
          <Select
            value={String(block.reminder ?? 0)}
            onValueChange={(v) => onChangeReminder(block.id, Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onUnschedule(block.id)}>
            Déplanifier
          </Button>
          <Button onClick={() => onToggleDone(task)}>
            {task.done ? "Rouvrir la tâche" : "Marquer la tâche faite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
