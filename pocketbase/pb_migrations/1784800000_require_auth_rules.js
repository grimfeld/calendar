/// <reference path="../pb_data/types.d.ts" />
// Lock the API down for the public (fly.io) deployment: every operation on
// events and tasks now requires an authenticated user (the built-in `users`
// auth collection — single personal account, created via the admin UI/CLI).
migrate((app) => {
  const rule = '@request.auth.id != ""';
  for (const id of ["pbc_1687431684", "pbc_3527180448"]) {
    const c = app.findCollectionByNameOrId(id);
    c.listRule = rule;
    c.viewRule = rule;
    c.createRule = rule;
    c.updateRule = rule;
    c.deleteRule = rule;
    app.save(c);
  }
}, (app) => {
  for (const id of ["pbc_1687431684", "pbc_3527180448"]) {
    const c = app.findCollectionByNameOrId(id);
    c.listRule = "";
    c.viewRule = "";
    c.createRule = "";
    c.updateRule = "";
    c.deleteRule = "";
    app.save(c);
  }
})
