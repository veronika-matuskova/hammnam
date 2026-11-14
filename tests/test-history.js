// History (#history): cooked meals (public.cooked_meals) and finished shopping
// lists (shopping_lists rows with completed_at set), migration 20261114124921.
// Both tables are private to the signed-in user, so reads send their token too.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, signedInSession, jsonResponse, plain } = require('./helpers/app-harness');

const RECIPE = {
  id: 3,
  title_sk: 'Tortilla z cottage',
  servings: 2,
  ingredients: [{ name: 'vajcia', amount: '2', unit: 'ks' }]
};

// Answers per table and method; records every call.
function historyStub({ meals = [], lists = [], fail = null } = {}) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    const table = String(url).match(/\/rest\/v1\/([a-z_]+)/)?.[1] || 'rpc';
    calls.push({ url: String(url), method, table, options, body });
    if (fail && fail(table, method)) return jsonResponse(500, { message: 'boom' });
    if (table === 'rpc') return jsonResponse(200, true);
    const rows = table === 'cooked_meals' ? meals : table === 'shopping_lists' ? lists : [RECIPE];
    if (method === 'GET') {
      if (/completed_at=is\.null/.test(url)) return jsonResponse(200, rows.filter((row) => !row.completed_at).slice(0, 1));
      if (/completed_at=not\.is\.null/.test(url)) return jsonResponse(200, rows.filter((row) => row.completed_at));
      return jsonResponse(200, rows);
    }
    if (method === 'POST') return jsonResponse(201, [{ id: 500 + calls.length, ...body }]);
    const id = String(url).match(/id=eq\.([^&]+)/)[1];
    const existing = rows.find((row) => String(row.id) === id);
    if (!existing) return jsonResponse(200, []);
    return jsonResponse(200, [method === 'DELETE' ? existing : { ...existing, ...body }]);
  };
  return Object.assign(fetch, { calls });
}

function signedInApp(fetch, hash = '') {
  const app = loadApp({ fetch, hash, session: signedInSession() });
  app.familyMember = true;
  app.recipes = [RECIPE];
  return app;
}

test('"Uvarené" POSTs the recipe, its title and the chosen servings with the user token', async () => {
  const fetch = historyStub();
  const app = signedInApp(fetch);
  app.setIngredientServings(RECIPE, 4);

  await app.logCookedMeal(RECIPE);

  assert.equal(fetch.calls.length, 1);
  const [call] = fetch.calls;
  assert.equal(call.table, 'cooked_meals');
  assert.equal(call.method, 'POST');
  assert.equal(call.options.headers.Authorization, 'Bearer user-token');
  assert.equal(call.options.headers.Prefer, 'return=representation');
  assert.equal('table' in call.options, false);
  assert.deepEqual(call.body, { recipe_id: 3, recipe_title: 'Tortilla z cottage', servings: 4 });
  assert.deepEqual(plain(app.cookNotice), { recipeId: 3 });
  assert.equal(app.cookError, '');
  assert.equal(app.cookSaving, false);
});

test('a failed cooked-meal write shows a Slovak error without technical details', async () => {
  const app = signedInApp(historyStub({ fail: () => true }));

  await app.logCookedMeal(RECIPE);

  assert.match(app.cookError, /^Uvarené jedlo sa nepodarilo zapísať\./);
  assert.doesNotMatch(app.cookError, /HTTP|boom/);
  assert.equal(app.cookNotice, null);
});

test('opening #history loads cooked meals and finished lists with the user token', async () => {
  const meals = [{ id: 1, recipe_id: 3, recipe_title: 'Tortilla z cottage', servings: 2, cooked_at: '2026-11-14T10:00:00Z' }];
  const lists = [
    { id: 8, created_at: '2026-11-10T10:00:00Z', completed_at: '2026-11-11T10:00:00Z', recipe_ids: [3], items: [{ name: 'vajcia', amount: '2', unit: 'ks', checked: true }] },
    { id: 9, created_at: '2026-11-13T10:00:00Z', completed_at: null, recipe_ids: [], items: [] }
  ];
  const fetch = historyStub({ meals, lists });
  const app = signedInApp(fetch);

  await app.openHistory('lists');

  assert.equal(app.showHistory, true);
  assert.equal(app.historyTab, 'lists');
  assert.equal(app.history.state.hamMnamHistory, true);
  const reads = fetch.calls.filter((call) => call.method === 'GET');
  assert.equal(reads.length, 2, 'loads once although syncRoute and openHistory both ask');
  assert.ok(reads.every((call) => call.options.headers.Authorization === 'Bearer user-token'));
  assert.match(reads.find((call) => call.table === 'cooked_meals').url, /order=cooked_at\.desc&limit=50/);
  assert.match(reads.find((call) => call.table === 'shopping_lists').url, /completed_at=not\.is\.null&order=completed_at\.desc/);
  assert.deepEqual(plain(app.cookedMeals), meals);
  assert.deepEqual(plain(app.pastShoppingLists.map((list) => list.id)), [8], 'the open list is not history');
  assert.deepEqual(plain(app.pastListRecipes(app.pastShoppingLists[0]).map((recipe) => recipe.id)), [3]);
  assert.equal(app.pastListProgress(app.pastShoppingLists[0]), '1 z 1 nakúpené');

  app.closeHistory();
  assert.equal(app.showHistory, false);
  assert.equal(app.location.hash, '');
});

test('a deep link to #history while signed out loads nothing', () => {
  const app = loadApp({ fetch: async () => { throw new Error('no request expected'); }, hash: '#history' });
  app.syncRoute();
  assert.equal(app.showHistory, true);
  assert.equal(app.historyLoading, false);
});

test('"Nakúpené" closes the open list and the next item starts a new one', async () => {
  const open = { id: 9, created_at: '2026-11-13T10:00:00Z', completed_at: null, recipe_ids: [3], items: [{ name: 'vajcia', amount: '2', unit: 'ks', checked: true }] };
  const fetch = historyStub({ lists: [open] });
  const app = signedInApp(fetch);
  await app.loadShoppingList();
  app.historyLoaded = true;

  await app.finishShoppingList();

  const patch = fetch.calls.find((call) => call.method === 'PATCH');
  assert.match(patch.url, /shopping_lists\?id=eq\.9$/);
  assert.deepEqual(Object.keys(patch.body), ['completed_at']);
  assert.match(patch.body.completed_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(plain(app.pastShoppingLists.map((list) => list.id)), [9]);
  assert.equal(app.shoppingListId, null);
  assert.deepEqual(plain(app.shoppingItems), []);
  assert.equal(app.shoppingLoaded, true);
  assert.equal(app.finishShoppingError, '');

  app.shoppingDraft = { name: 'mlieko', amount: '1', unit: 'l' };
  app.addShoppingDraft();
  await app.saveShoppingList();
  const created = fetch.calls.filter((call) => call.table === 'shopping_lists' && call.method === 'POST');
  assert.equal(created.length, 1, 'a new list row is created');
  assert.deepEqual(plain(created[0].body.items.map((item) => item.name)), ['mlieko']);
});

test('a failed "Nakúpené" keeps the list open and shows an error', async () => {
  const open = { id: 9, completed_at: null, recipe_ids: [], items: [{ name: 'vajcia', amount: '2', unit: 'ks', checked: false }] };
  const app = signedInApp(historyStub({ lists: [open], fail: (table, method) => method === 'PATCH' }));
  await app.loadShoppingList();

  await app.finishShoppingList();

  assert.equal(app.shoppingListId, 9);
  assert.equal(app.shoppingItems.length, 1);
  assert.match(app.finishShoppingError, /^Zoznam sa nepodarilo presunúť do histórie\./);
});

test('deleting a history entry removes it; a delete that matches no row keeps it', async () => {
  const meal = { id: 1, recipe_id: 3, recipe_title: 'Tortilla z cottage', servings: 2 };
  const fetch = historyStub({ meals: [meal] });
  const app = signedInApp(fetch);
  app.cookedMeals = [{ ...meal }, { id: 2, recipe_title: 'Iné', servings: 1 }];

  await app.deleteHistoryEntry('meal', app.cookedMeals[0]);
  assert.equal(fetch.calls[0].method, 'DELETE');
  assert.match(fetch.calls[0].url, /cooked_meals\?id=eq\.1$/);
  assert.deepEqual(plain(app.cookedMeals.map((item) => item.id)), [2]);

  await app.deleteHistoryEntry('meal', app.cookedMeals[0]);
  assert.deepEqual(plain(app.cookedMeals.map((item) => item.id)), [2]);
  assert.match(app.historyActionError, /^Záznam sa nepodarilo odstrániť\./);
});

test('signing out clears the loaded history', async () => {
  const app = signedInApp(async () => jsonResponse(204));
  app.cookedMeals = [{ id: 1 }];
  app.pastShoppingLists = [{ id: 9 }];
  app.historyLoaded = true;

  await app.signOut();

  assert.deepEqual(plain(app.cookedMeals), []);
  assert.deepEqual(plain(app.pastShoppingLists), []);
  assert.equal(app.historyLoaded, false);
});
