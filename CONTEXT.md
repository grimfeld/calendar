# Calendar

A personal calendar app for filling a schedule with events and tasks. Single-user, low-friction; Google Calendar is the UX reference point.

## Language

**Event**:
A thing that happens at a fixed time: a start, an end (or all-day), independent of any task.
_Avoid_: Appointment, meeting

**Task**:
A unit of work to get done. Exists independently of the calendar in the Backlog; carries no time of its own and no effort estimate. Completable as a whole (done/not done).
_Avoid_: Todo, item

**TimeBlock**:
A scheduled session of work on one Task — a slot on the calendar with a start and end. A Task can have any number of TimeBlocks (including zero). Represented as an Event linked to its Task; its title derives from the Task.
_Avoid_: Session, slot, scheduled task

**Backlog**:
The list of Tasks, scheduled or not. Where Tasks are created and marked done.
_Avoid_: Task list, inbox

**Schedule (verb)**:
Placing a TimeBlock for a Task onto the calendar grid.
