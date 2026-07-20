/// <reference path="../pb_data/types.d.ts" />
// Per-event reminder offset in minutes before `start` (0 = no reminder).
// All-day items with a reminder notify at 09:00 local on the day.
migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.add(new NumberField({
    "hidden": false,
    "id": "number2862495610",
    "max": null,
    "min": 0,
    "name": "reminder",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));
  return app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.removeById("number2862495610");
  return app.save(events);
})
