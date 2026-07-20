/// <reference path="../pb_data/types.d.ts" />
// Recurring tasks: a task with `repeat` reopens at the start of the next
// period after being completed. `done_on` records when it was last completed
// so clients can decide whether the current period is already done.
migrate((app) => {
  const tasks = app.findCollectionByNameOrId("pbc_3527180448");
  tasks.fields.add(new SelectField({
    "hidden": false,
    "id": "select3149528959",
    "maxSelect": 1,
    "name": "repeat",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["daily", "weekly", "monthly"]
  }));
  tasks.fields.add(new DateField({
    "hidden": false,
    "id": "date2263749764",
    "max": "",
    "min": "",
    "name": "done_on",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }));
  return app.save(tasks);
}, (app) => {
  const tasks = app.findCollectionByNameOrId("pbc_3527180448");
  tasks.fields.removeById("select3149528959");
  tasks.fields.removeById("date2263749764");
  return app.save(tasks);
})
