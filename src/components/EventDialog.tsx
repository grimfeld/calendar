import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toLocalDateInput, toLocalInput } from "@/lib/eventMap";

export const REMINDER_OPTIONS = [
  { value: 0, label: "Aucun" },
  { value: 5, label: "5 minutes avant" },
  { value: 10, label: "10 minutes avant" },
  { value: 30, label: "30 minutes avant" },
  { value: 60, label: "1 heure avant" },
] as const;

/** What the dialog edits. `id` present = editing an existing event. */
export interface EventDraft {
  id?: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  description: string;
  reminder: number;
}

export interface EventSubmit {
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  description: string;
  reminder: number;
}

/**
 * Create/edit form for standalone Events: title, time range (or all-day),
 * description. Google-style quick-create opens this prefilled from a grid
 * drag-selection.
 */
export function EventDialog({
  draft,
  onSubmit,
  onDelete,
  onClose,
}: {
  draft: EventDraft | null;
  onSubmit: (id: string | undefined, data: EventSubmit) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(0);

  // Re-seed the form whenever a new draft opens the dialog.
  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setAllDay(draft.allDay);
    setDescription(draft.description);
    setReminder(draft.reminder);
    if (draft.allDay) {
      setStart(toLocalDateInput(draft.start));
      setEnd(draft.end ? toLocalDateInput(draft.end) : "");
    } else {
      setStart(toLocalInput(draft.start));
      setEnd(draft.end ? toLocalInput(draft.end) : "");
    }
  }, [draft]);

  if (!draft) return null;

  function toggleAllDay(next: boolean) {
    setAllDay(next);
    // Re-render the current values in the other input format.
    const s = start ? new Date(start) : new Date();
    const e = end ? new Date(end) : null;
    if (next) {
      setStart(toLocalDateInput(s));
      setEnd(e ? toLocalDateInput(e) : "");
    } else {
      s.setHours(9, 0, 0, 0);
      setStart(toLocalInput(s));
      if (e) {
        e.setHours(10, 0, 0, 0);
        setEnd(toLocalInput(e));
      } else {
        setEnd("");
      }
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start) return;
    onSubmit(draft!.id, {
      title: title.trim(),
      start: new Date(start),
      end: end ? new Date(end) : null,
      allDay,
      description: description.trim(),
      reminder,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="event-title">Titre</Label>
            <Input
              id="event-title"
              placeholder="Titre de l'événement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="event-all-day"
              checked={allDay}
              onCheckedChange={(c) => toggleAllDay(c === true)}
            />
            <Label htmlFor="event-all-day">Toute la journée</Label>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="event-start">Début</Label>
              <Input
                id="event-start"
                className="w-full min-w-0"
                type={allDay ? "date" : "datetime-local"}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="event-end">Fin</Label>
              <Input
                id="event-end"
                className="w-full min-w-0"
                type={allDay ? "date" : "datetime-local"}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Rappel</Label>
            <Select
              // All-day reminders always fire morning-of; collapse to on/off.
              value={allDay ? (reminder > 0 ? "10" : "0") : String(reminder)}
              onValueChange={(v) => setReminder(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allDay ? (
                  <>
                    <SelectItem value="0">Aucun</SelectItem>
                    <SelectItem value="10">Le matin même (9h00)</SelectItem>
                  </>
                ) : (
                  REMINDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="Facultatif"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            {draft.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(draft!.id!)}
              >
                Supprimer
              </Button>
            )}
            <Button type="submit" disabled={!title.trim() || !start}>
              {draft.id ? "Enregistrer" : "Ajouter l'événement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
