/// <reference path="../pb_data/types.d.ts" />
// Tasks (backlog items) + the TimeBlock link: an event row with a `task`
// relation IS a TimeBlock (see docs/adr/0001). Public rules, same as `events`
// — local, no-login instance (lock down before any VPS deployment).
migrate((app) => {
  const tasks = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text724990059",
        "max": 200,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1843675174",
        "max": 0,
        "min": 0,
        "name": "notes",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "bool2099929237",
        "name": "done",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3527180448",
    "indexes": [],
    "listRule": "",
    "name": "tasks",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });
  app.save(tasks);

  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.add(new RelationField({
    "cascadeDelete": true,
    "collectionId": "pbc_3527180448",
    "hidden": false,
    "id": "relation3545646658",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "task",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }));
  return app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.removeById("relation3545646658");
  app.save(events);

  const tasks = app.findCollectionByNameOrId("pbc_3527180448");
  return app.delete(tasks);
})
