/// <reference path="../pb_data/types.d.ts" />
// Blockers: standalone drag-droppable time reservations (travel time, breaks)
// not linked to a task. Stored as an event row flagged `blocker` so they share
// the grid interactions (drag/resize/edit) without being real events.
migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.add(new BoolField({
    "hidden": false,
    "id": "bool2862495610",
    "name": "blocker",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));
  return app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.removeById("bool2862495610");
  return app.save(events);
})
