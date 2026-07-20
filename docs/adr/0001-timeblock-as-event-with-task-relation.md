# TimeBlocks are Events with a task relation

A Task can be scheduled into any number of TimeBlocks on the calendar. Rather than a separate `task_blocks` collection, a TimeBlock is stored as a row in the existing `events` collection with an optional `task` relation field (cascade-delete). This gives one source of truth for everything on the grid — one fetch, one mapping layer, one drag/resize/persist path — at the cost of `events` no longer being purely "standalone events".

## Considered Options

- **Separate `task_blocks(task, start, end)` collection** — cleaner conceptual split, but every grid feature (fetch, Temporal mapping, drag-and-drop, resize, popup) would be duplicated or merged client-side across two collections.
- **Single collection with a `kind` field and no `tasks` collection** — unscheduled tasks would be date-less events, and multiple blocks per task would need a self-relation; muddier than either alternative.

## Consequences

- A block's display title derives from its Task; the `title` field on block rows is denormalised and must be kept in sync (or ignored at render time).
- Deleting a Task cascade-deletes its block rows in `events`.
- Queries for "real" events must filter `task = ""` if the distinction ever matters server-side.
