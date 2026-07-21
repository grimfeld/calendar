import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskRecord } from "@/lib/pb";

export interface TaskSubmit {
  title: string;
  notes: string;
  repeat: string;
}

/** Edit a Task: title, notes, recurrence. */
export function TaskDialog({
  task,
  onSubmit,
  onClose,
}: {
  task: TaskRecord | null;
  onSubmit: (id: string, data: TaskSubmit) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [repeat, setRepeat] = useState("none");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes);
    setRepeat(task.repeat || "none");
  }, [task]);

  if (!task) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(task!.id, {
      title: title.trim(),
      notes: notes.trim(),
      repeat: repeat === "none" ? "" : repeat,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Titre</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              placeholder="Facultatif"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Répétition</Label>
            <Select value={repeat} onValueChange={setRepeat}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Jamais</SelectItem>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire (lundi)</SelectItem>
                <SelectItem value="monthly">Mensuelle (le 1er)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Une tâche répétitive se rouvre au début de la période suivante
              une fois terminée.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
