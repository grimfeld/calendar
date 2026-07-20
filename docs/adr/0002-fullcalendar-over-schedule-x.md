# FullCalendar replaces Schedule-X for the calendar grid

The walking skeleton used Schedule-X v4, but in v4 every interaction the product needs — drag-to-move, resize, drag-range-to-create, dragging tasks in from a sidebar — is paywalled behind `@sx-premium` (the MIT drag-and-drop/resize plugins stopped at v3.7.3, and external drag was never free). FullCalendar's MIT packages (`@fullcalendar/daygrid`, `timegrid`, `interaction`) cover the full set, including first-class external-element dragging (`Draggable`), so we swapped. FullCalendar premium is only needed for timeline/resource views, which this app does not use.

## Consequences

- `temporal-polyfill` is no longer needed by the calendar layer (FullCalendar takes ISO strings/Dates).
- The shadcn look must be approximated with `--fc-*` CSS variables instead of a prebuilt theme package.
