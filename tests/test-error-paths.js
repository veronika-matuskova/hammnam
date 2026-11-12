// Error paths for loading, saving and favouriting recipes: HTTP 500, HTTP 401
// (e.g. a wrong or rotated anon key) and a network failure (offline).
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, jsonResponse, networkError, supabaseStub, plain } = require('./helpers/app-harness');

const FAILURES = {
  'HTTP 500': async () => jsonResponse(500, { message: 'internal error', code: 'XX000' }),
  'HTTP 401': async () => jsonResponse(401, { message: 'Invalid API key', hint: 'Double check your Supabase `anon` key.' }),
  'network error': async () => { throw networkError(); }
};

const recipe = { id: 42, title_sk: 'Koláč', category_sk: 'Dezert', ingredients: [], steps: [], notes: '', favorite: false };

// A fetch stub that serves the recipe list, then answers every write with `failure`.
// Only the writes are recorded in `calls`.
function failingWrites(failure, calls = []) {
  const ok = supabaseStub([recipe]);
  return async (url, options = {}) => {
    if ((options.method || 'GET') === 'GET') return ok(url, options);
    calls.push({ url, method: options.method, body: JSON.parse(options.body) });
    return failure();
  };
}

// --- loading the list ----------------------------------------------------------

for (const [name, failure] of Object.entries(FAILURES)) {
  test(`loading recipes: ${name} shows the connection error and stops loading`, async () => {
    const app = loadApp({ fetch: failure });
    await app.init();

    assert.equal(app.loading, false);
    assert.equal(app.recipesLoaded, false);
    assert.deepEqual(plain(app.recipes), []);
    assert.ok(app.errorMessage.startsWith(app.t('connectionError')), app.errorMessage);
  });
}

test('loading recipes: the HTTP status is part of the (technical) message', async () => {
  const app = loadApp({ fetch: FAILURES['HTTP 401'] });
  await app.fetchRecipes();
  assert.match(app.errorMessage, /HTTP 401/);
});

test('loading recipes: an unexpected response shape is an error, not an empty list', async () => {
  const app = loadApp({ fetch: async () => jsonResponse(200, { message: 'not a list' }) });
  await app.fetchRecipes();

  assert.equal(app.loading, false);
  assert.equal(app.recipesLoaded, false);
  assert.ok(app.errorMessage.startsWith(app.t('connectionError')), app.errorMessage);
});

test('loading recipes: a missing Supabase config shows the config message only', async () => {
  let called = false;
  const app = loadApp({ fetch: async () => { called = true; }, supabaseConfig: null });
  await app.fetchRecipes();

  assert.equal(called, false);
  assert.equal(app.errorMessage, app.t('databaseUnavailable'));
  assert.equal(app.loading, false);
});

test('loading recipes: retry after a failure clears the error and shows the list', async () => {
  let fail = true;
  const ok = supabaseStub([recipe]);
  const app = loadApp({ fetch: async (url, options) => (fail ? FAILURES['network error']() : ok(url, options)) });
  await app.fetchRecipes();
  assert.notEqual(app.errorMessage, '');

  fail = false;
  await app.fetchRecipes();
  assert.equal(app.errorMessage, '');
  assert.equal(app.recipes.length, 1);
  assert.equal(app.recipesLoaded, true);
});

test('loading recipes: a deep link survives a failed load and opens after retry', async () => {
  let fail = true;
  const ok = supabaseStub([recipe]);
  const app = loadApp({ hash: '#recipe/42', fetch: async (url, options) => (fail ? FAILURES['HTTP 500']() : ok(url, options)) });
  await app.init();

  // The id is unknown only because nothing loaded; the hash must not be dropped.
  assert.equal(app.location.hash, '#recipe/42');
  assert.equal(app.selectedRecipe, null);

  fail = false;
  await app.fetchRecipes();
  assert.equal(app.selectedRecipe.id, 42);
});

test('requests send the anon key as apikey and bearer token', async () => {
  const calls = [];
  const app = loadApp({ fetch: supabaseStub([], calls) });
  await app.fetchRecipes();

  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/recipes?select=*&order=created_at.desc');
  assert.equal(calls[0].options.headers.apikey, 'test-key');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
});

// --- saving a new recipe ----------------------------------------------------------

for (const [name, failure] of Object.entries(FAILURES)) {
  test(`saving a new recipe: ${name} keeps the form open with the user's input`, async () => {
    const calls = [];
    const app = loadApp({ fetch: failingWrites(failure, calls) });
    await app.init();
    app.openForm();
    app.newRecipe.title_sk = 'Polievka';
    app.newRecipe.category_sk = 'Obed';
    app.newRecipe.calories = '12,5';
    app.newRecipe.steps = ['Uvariť.'];

    await app.addRecipe();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.equal(app.saving, false);
    assert.ok(app.formError.startsWith(app.t('saveError')), app.formError);
    assert.equal(app.showForm, true);
    assert.equal(app.location.hash, '#new-recipe');
    assert.equal(app.recipes.length, 1);
    assert.equal(app.newRecipe.title_sk, 'Polievka');
    assert.equal(app.newRecipe.calories, '12,5');
    assert.deepEqual(plain(app.newRecipe.steps), ['Uvariť.']);
  });
}

test('saving a new recipe: a 201 without the created row is an error', async () => {
  const app = loadApp({ fetch: async () => jsonResponse(201, []) });
  app.openForm();
  app.newRecipe.title_sk = 'Polievka';
  app.newRecipe.category_sk = 'Obed';

  await app.addRecipe();

  assert.ok(app.formError.startsWith(app.t('saveError')), app.formError);
  assert.equal(app.showForm, true);
  assert.equal(app.recipes.length, 0);
});

test('saving a new recipe: retry after a failure posts once and closes the form', async () => {
  let fail = true;
  const calls = [];
  const ok = supabaseStub([], calls);
  const app = loadApp({ fetch: async (url, options) => (fail ? FAILURES['HTTP 500']() : ok(url, options)) });
  app.openForm();
  app.newRecipe.title_sk = 'Polievka';
  app.newRecipe.category_sk = 'Obed';
  await app.addRecipe();

  fail = false;
  await app.addRecipe();

  assert.equal(app.formError, '');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.equal(app.recipes.length, 1);
  assert.equal(app.showForm, false);
  assert.equal(app.location.hash, '');
});

// --- saving an edit ------------------------------------------------------------

for (const [name, failure] of Object.entries(FAILURES)) {
  test(`saving an edit: ${name} keeps editing the same recipe`, async () => {
    const calls = [];
    const app = loadApp({ fetch: failingWrites(failure, calls) });
    await app.init();
    app.openRecipe(app.recipes[0]);
    app.editRecipe(app.selectedRecipe);
    app.newRecipe.title_sk = 'Upravený koláč';

    await app.addRecipe();

    assert.equal(calls[0].method, 'PATCH');
    assert.match(calls[0].url, /\?id=eq\.42$/);
    assert.equal(app.saving, false);
    assert.ok(app.formError.startsWith(app.t('saveError')), app.formError);
    assert.equal(app.showForm, true);
    assert.equal(app.editingRecipeId, 42);
    assert.equal(app.location.hash, '#edit-recipe/42');
    assert.equal(app.newRecipe.title_sk, 'Upravený koláč');
    assert.equal(app.recipes[0].title_sk, 'Koláč', 'the list keeps the stored value');
  });
}

test('saving an edit: retry after a failure PATCHes again instead of creating a duplicate', async () => {
  let fail = true;
  const calls = [];
  const ok = supabaseStub([recipe], calls);
  const app = loadApp({ fetch: async (url, options) => (fail && options && options.method ? FAILURES['network error']() : ok(url, options)) });
  await app.init();
  app.openRecipe(app.recipes[0]);
  app.editRecipe(app.selectedRecipe);
  app.newRecipe.title_sk = 'Upravený koláč';
  await app.addRecipe();

  fail = false;
  await app.addRecipe();

  const writes = calls.filter((call) => call.method !== 'GET');
  assert.deepEqual(writes.map((call) => call.method), ['PATCH']);
  assert.equal(app.recipes.length, 1);
  assert.equal(app.recipes[0].title_sk, 'Upravený koláč');
  assert.equal(app.location.hash, '#recipe/42');
});

test('saving an edit: a PATCH that matches no rows is an error', async () => {
  // e.g. the row was deleted meanwhile, or row-level security hides it.
  const ok = supabaseStub([recipe]);
  const app = loadApp({ fetch: async (url, options = {}) => (options.method === 'PATCH' ? jsonResponse(200, []) : ok(url, options)) });
  await app.init();
  app.editRecipe(app.recipes[0]);

  await app.addRecipe();

  assert.ok(app.formError.startsWith(app.t('saveError')), app.formError);
  assert.equal(app.showForm, true);
});

test('the form cannot be closed while a save is in flight', async () => {
  let release;
  const app = loadApp({ fetch: () => new Promise((resolve) => { release = () => resolve(jsonResponse(500, {})); }) });
  app.openForm();
  app.newRecipe.title_sk = 'Polievka';
  app.newRecipe.category_sk = 'Obed';

  const saving = app.addRecipe();
  assert.equal(app.saving, true);
  app.closeForm();
  assert.equal(app.showForm, true);
  assert.equal(app.newRecipe.title_sk, 'Polievka');

  release();
  await saving;
  assert.equal(app.saving, false);
});

// --- favourites ----------------------------------------------------------------

for (const [name, failure] of Object.entries(FAILURES)) {
  for (const startFavorite of [false, true]) {
    test(`favourite ${startFavorite ? 'off' : 'on'}: ${name} rolls back and shows the favourite error`, async () => {
      const app = loadApp({ fetch: failingWrites(failure) });
      await app.init();
      const item = app.recipes[0];
      item.favorite = startFavorite;

      await app.toggleFavorite(item);

      assert.equal(item.favorite, startFavorite);
      assert.ok(app.favoriteErrorMessage.startsWith(app.t('favoriteError')), app.favoriteErrorMessage);
      assert.equal(app.errorMessage, '', 'the load-error block must stay empty (#11)');
      assert.equal(app.isFavoriteSaving(item), false);
    });
  }
}

// --- user-facing messages (bug #15) ---------------------------------------------

// #15: "Users see translated messages; technical details go to the console only."
// Today every message appends the raw error, e.g. "(Supabase HTTP 401: {"message":"Invalid API key",...})".
const RAW_DETAILS = /Supabase HTTP|Failed to fetch|Invalid API key|\{"/;

test('loading recipes: users do not see raw Supabase error text', { todo: 'bug #15: raw Supabase error text is shown to users' }, async () => {
  for (const failure of Object.values(FAILURES)) {
    const app = loadApp({ fetch: failure });
    await app.fetchRecipes();
    assert.doesNotMatch(app.errorMessage, RAW_DETAILS);
  }
});

test('saving: users do not see raw Supabase error text', { todo: 'bug #15: raw Supabase error text is shown to users' }, async () => {
  for (const failure of Object.values(FAILURES)) {
    const app = loadApp({ fetch: failure });
    app.openForm();
    app.newRecipe.title_sk = 'Polievka';
    app.newRecipe.category_sk = 'Obed';
    await app.addRecipe();
    assert.doesNotMatch(app.formError, RAW_DETAILS);
  }
});

test('favourite: users do not see raw Supabase error text', { todo: 'bug #15: raw Supabase error text is shown to users' }, async () => {
  for (const failure of Object.values(FAILURES)) {
    const app = loadApp({ fetch: failure });
    await app.toggleFavorite({ id: 1, favorite: false });
    assert.doesNotMatch(app.favoriteErrorMessage, RAW_DETAILS);
  }
});
