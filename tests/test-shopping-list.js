const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, jsonResponse, deferred, signedInSession, plain } = require('./helpers/app-harness');

const LIST_URL = 'https://example.supabase.co/rest/v1/shopping_lists';

// Answers like Supabase REST for shopping_lists: GET returns `rows`,
// POST creates id 55, PATCH echoes the body. Every call is recorded.
function shoppingStub(rows = [], calls = []) {
  const fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ url: String(url), method, options, body });
    if (String(url).includes('/rpc/is_family_member')) return jsonResponse(200, true);
    if (method === 'GET') return jsonResponse(200, rows);
    if (method === 'POST') return jsonResponse(201, [{ id: 55, ...body }]);
    return jsonResponse(200, [{ id: 7, ...body }]);
  };
  return Object.assign(fetch, { calls });
}

async function signedInApp(rows = [], options = {}) {
  const fetch = shoppingStub(rows);
  const app = loadApp({ fetch, session: signedInSession(), ...options });
  await app.loadShoppingList();
  return { app, calls: fetch.calls };
}

const writes = (calls) => calls.filter((call) => call.method !== 'GET' && call.url.startsWith(LIST_URL));

test('loads the newest open list with the user token', async () => {
  const { app, calls } = await signedInApp([
    { id: 7, items: [{ name: 'Mlieko', amount: '1', unit: 'l', checked: false }, { name: '' }], recipe_ids: [3] }
  ]);

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `${LIST_URL}?select=id,items,recipe_ids&completed_at=is.null&order=created_at.desc&limit=1`
  );
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-token');
  assert.equal(app.shoppingListId, 7);
  assert.deepEqual(plain(app.shoppingItems), [{ name: 'Mlieko', amount: '1', unit: 'l', checked: false }]);
  assert.deepEqual(plain(app.shoppingRecipeIds), [3]);
  assert.equal(app.shoppingLoaded, true);
});

test('is not available signed out, and is cleared on sign-out', async () => {
  const fetch = shoppingStub();
  const signedOut = loadApp({ fetch });
  assert.equal(signedOut.canUseShoppingList, false);
  await signedOut.loadShoppingList();
  assert.equal(fetch.calls.length, 0);

  const { app } = await signedInApp([{ id: 7, items: [{ name: 'Chlieb' }], recipe_ids: [] }]);
  await app.signOut();
  assert.equal(app.canUseShoppingList, false);
  assert.deepEqual(plain(app.shoppingItems), []);
  assert.equal(app.shoppingListId, null);
  assert.equal(app.shoppingLoaded, false);
});

test('is hidden from signed-in users who are not family members', () => {
  const app = loadApp({ fetch: shoppingStub(), session: signedInSession() });
  app.familyMember = false;
  assert.equal(app.canUseShoppingList, false);
});

test('the first item creates the list, later changes update it', async () => {
  const { app, calls } = await signedInApp([]);

  app.shoppingDraft = { name: '  mlieko ', amount: '2', unit: 'l' };
  await app.addShoppingDraft();
  await app.saveShoppingList();

  const [create, update] = writes(calls);
  assert.equal(create.method, 'POST');
  assert.equal(create.url, LIST_URL);
  assert.equal(create.options.headers.Authorization, 'Bearer user-token');
  assert.deepEqual(create.body, { items: [{ name: 'mlieko', amount: '2', unit: 'l', checked: false }], recipe_ids: [] });
  assert.equal(app.shoppingListId, 55);
  assert.equal(update.method, 'PATCH');
  assert.equal(update.url, `${LIST_URL}?id=eq.55`);
  assert.deepEqual(plain(app.shoppingDraft), { name: '', amount: '', unit: '' });
});

test('changes made while a save runs are saved once, right after it', async () => {
  const first = deferred();
  const calls = [];
  let patches = 0;
  const fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body && JSON.parse(options.body) });
    if (!options.method) return jsonResponse(200, [{ id: 7, items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], recipe_ids: [] }]);
    patches += 1;
    if (patches === 1) await first.promise;
    return jsonResponse(200, [{ id: 7 }]);
  };
  const app = loadApp({ fetch, session: signedInSession() });
  await app.loadShoppingList();

  app.toggleShoppingItem(0);
  app.toggleShoppingItem(1);
  app.toggleShoppingItem(2);
  assert.equal(app.shoppingSaving, true);
  first.resolve();
  await app.saveShoppingList();

  const sent = calls.filter((call) => call.method === 'PATCH');
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1].body.items.map((item) => item.checked), [true, true, true]);
  assert.equal(app.shoppingSaving, false);
});

test('a failed save shows a Slovak message and keeps the change on screen', async () => {
  const fetch = async (url, options = {}) => (options.method
    ? jsonResponse(500, { message: 'boom' })
    : jsonResponse(200, [{ id: 7, items: [{ name: 'Mlieko' }], recipe_ids: [] }]));
  const app = loadApp({ fetch, session: signedInSession() });
  await app.loadShoppingList();

  app.toggleShoppingItem(0);
  await app.saveShoppingList();

  assert.equal(app.shoppingItems[0].checked, true);
  assert.match(app.shoppingSaveError, /^Zmeny v nákupnom zozname sa nepodarilo uložiť\./);
  assert.doesNotMatch(app.shoppingSaveError, /Supabase|HTTP|boom/);
});

test('an update blocked by RLS (no rows) is reported', async () => {
  const fetch = async (url, options = {}) => (options.method
    ? jsonResponse(200, [])
    : jsonResponse(200, [{ id: 7, items: [{ name: 'Mlieko' }], recipe_ids: [] }]));
  const app = loadApp({ fetch, session: signedInSession() });
  await app.loadShoppingList();
  app.removeShoppingItem(0);
  await app.saveShoppingList();
  assert.match(app.shoppingSaveError, /nepodarilo uložiť/);
});

test('nothing is written when the list could not be loaded', async () => {
  const calls = [];
  const fetch = async (url, options = {}) => {
    calls.push(options.method || 'GET');
    return jsonResponse(503, {});
  };
  const app = loadApp({ fetch, session: signedInSession() });
  await app.loadShoppingList();
  assert.match(app.shoppingLoadError, /^Nákupný zoznam sa nepodarilo načítať\./);

  app.shoppingDraft = { name: 'Mlieko', amount: '', unit: '' };
  app.addShoppingDraft();
  assert.deepEqual(calls, ['GET']);
  assert.deepEqual(plain(app.shoppingItems), []);
});

test('open items come first; removing bought items keeps the rest', async () => {
  const { app, calls } = await signedInApp([{
    id: 7,
    items: [
      { name: 'Mlieko', checked: true },
      { name: 'Chlieb', checked: false },
      { name: 'Vajcia', checked: true }
    ],
    recipe_ids: [3]
  }]);

  assert.deepEqual(plain(app.shoppingRows.map((row) => row.item.name)), ['Chlieb', 'Mlieko', 'Vajcia']);
  assert.equal(app.shoppingRemainingCount, 1);
  assert.equal(app.shoppingCheckedCount, 2);

  app.removeCheckedShoppingItems();
  await app.saveShoppingList();
  assert.deepEqual(plain(app.shoppingItems.map((item) => item.name)), ['Chlieb']);
  assert.deepEqual(writes(calls).at(-1).body.recipe_ids, [3]);

  app.clearShoppingList();
  await app.saveShoppingList();
  assert.deepEqual(writes(calls).at(-1).body, { items: [], recipe_ids: [] });
});

test('adds recipe ingredients for the chosen servings and merges with the list', async () => {
  const { app, calls } = await signedInApp([{
    id: 7,
    items: [
      { name: 'Ryža', amount: '100', unit: 'g', checked: false },
      { name: 'Soľ', amount: '', unit: '', checked: false },
      { name: 'Cibuľa', amount: '1', unit: 'ks', checked: true }
    ],
    recipe_ids: []
  }]);
  const recipe = {
    id: 3,
    servings: 2,
    ingredients: [
      { name: 'ryza', amount: '200', unit: 'g' },
      { name: 'Soľ', amount: 'podľa chuti', unit: '' },
      { name: 'Cibuľa', amount: '1', unit: 'ks' },
      { name: 'Mrkva', amount: '1,5', unit: 'ks' },
      { name: '', amount: '5', unit: 'g' }
    ]
  };
  app.recipes = [recipe];
  app.setIngredientServings(recipe, 4);

  await app.addRecipeToShoppingList(recipe);
  await app.saveShoppingList();

  assert.deepEqual(plain(app.shoppingItems), [
    { name: 'Ryža', amount: '500', unit: 'g', checked: false },
    { name: 'Soľ', amount: 'podľa chuti', unit: '', checked: false },
    { name: 'Cibuľa', amount: '2', unit: 'ks', checked: false },
    { name: 'Mrkva', amount: '3', unit: 'ks', checked: false }
  ]);
  assert.deepEqual(writes(calls).at(-1).body.recipe_ids, [3]);
  assert.deepEqual(plain(app.shoppingAddedNotice), { recipeId: 3, count: 4 });
  assert.deepEqual(plain(app.shoppingRecipes.map((item) => item.id)), [3]);

  // Adding the same recipe again does not repeat its id.
  await app.addRecipeToShoppingList(recipe);
  await app.saveShoppingList();
  assert.deepEqual(writes(calls).at(-1).body.recipe_ids, [3]);
});

test('text amounts or different units go on their own line', async () => {
  const { app } = await signedInApp([{ id: 7, items: [{ name: 'Múka', amount: '1–2', unit: 'hrnčeky' }], recipe_ids: [] }]);
  app.shoppingDraft = { name: 'Múka', amount: '1', unit: 'hrnčeky' };
  app.addShoppingDraft();
  app.shoppingDraft = { name: 'Múka', amount: '500', unit: 'g' };
  app.addShoppingDraft();
  await app.saveShoppingList();
  assert.deepEqual(plain(app.shoppingItems.map((item) => `${item.amount} ${item.unit}`)), ['1–2 hrnčeky', '1 hrnčeky', '500 g']);
});

test('#shopping-list opens the list and Back returns to the recipes', async () => {
  const fetch = shoppingStub([{ id: 7, items: [], recipe_ids: [] }]);
  const app = loadApp({ fetch, session: signedInSession() });
  app.recipes = [{ id: 3, title_sk: 'Rizoto' }];
  app.recipesLoaded = true;

  app.openShoppingList();
  assert.equal(app.location.hash, '#shopping-list');
  assert.equal(app.showShoppingList, true);
  await app.saveShoppingList();

  app.closeShoppingList();
  assert.equal(app.location.hash, '');
  assert.equal(app.showShoppingList, false);

  // Deep link: the list loads, and Back replaces the hash instead of leaving the app.
  const linked = loadApp({ fetch: shoppingStub([]), session: signedInSession(), hash: '#shopping-list' });
  linked.syncRoute();
  assert.equal(linked.showShoppingList, true);
  assert.equal(linked.shoppingLoading, true);
  linked.closeShoppingList();
  assert.equal(linked.location.hash, '');
  assert.equal(linked.history.leftApp, false);

  // Opening a recipe from the list leaves the list view.
  app.openShoppingList();
  app.openLinkedRecipe(app.recipes[0]);
  assert.equal(app.showShoppingList, false);
  assert.equal(app.location.hash, '#recipe/3');
});

test('recipes still load with the publishable key and no Authorization of the user', async () => {
  const calls = [];
  const app = loadApp({
    fetch: async (url, options = {}) => { calls.push({ url: String(url), options }); return jsonResponse(200, []); },
    session: signedInSession()
  });
  await app.fetchRecipes();
  assert.match(calls[0].url, /\/rest\/v1\/recipes\?/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
});
