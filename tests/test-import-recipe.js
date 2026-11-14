// Importing a recipe from a link: the app calls the import-recipe Edge Function
// with the user's token and fills the new-recipe form with the answer.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, signedInSession, jsonResponse, networkError, plain } = require('./helpers/app-harness');

const importedRecipe = {
  title_sk: 'Zapekané vajcia',
  title_cs: 'Zapékaná vejce',
  category_sk: 'Raňajky / Obed',
  category_cs: 'Snídaně / Oběd',
  photo: 'https://example.com/photo.jpg',
  servings: 3,
  total_weight: 350,
  calories: 182,
  carbs: 3.6,
  proteins: 14.1,
  fats: 11.9,
  fiber: 0.8,
  salt: 1.1,
  sj: 0.4,
  gi: 16,
  glycemic_load: 0.7,
  ingredients: [{ name: 'vajcia', amount: '3', unit: 'ks' }, null],
  steps: ['Rúru predhrej na 175 °C.', ''],
  notes: 'Zdroj: https://example.com/recipe'
};

function importStub(calls, respond) {
  return async (url, options = {}) => {
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : undefined });
    return respond(url, options);
  };
}

function openNewForm(fetch) {
  const app = loadApp({ fetch, session: signedInSession() });
  app.openForm();
  return app;
}

test('a link fills the new-recipe form without saving', async () => {
  const calls = [];
  const app = openNewForm(importStub(calls, () => jsonResponse(200, { mode: 'ai', recipe: importedRecipe })));
  app.importUrl = 'example.com/recipe';

  await app.importRecipe();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/functions/v1/import-recipe');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-token');
  assert.deepEqual(calls[0].body, { url: 'https://example.com/recipe' });
  assert.equal(app.importing, false);
  assert.equal(app.importError, '');
  assert.equal(app.importMessage, app.t('importDone'));
  assert.equal(app.newRecipe.title_sk, 'Zapekané vajcia');
  assert.equal(app.newRecipe.category_sk, 'Raňajky / Obed');
  assert.equal(app.newRecipe.gi, '16');
  assert.equal(app.newRecipe.calories, 182);
  assert.equal(app.newRecipe.total_weight, 350);
  assert.deepEqual(plain(app.newRecipe.ingredients), [{ name: 'vajcia', amount: '3', unit: 'ks' }]);
  assert.deepEqual(plain(app.newRecipe.steps), ['Rúru predhrej na 175 °C.']);
  assert.equal(app.showForm, true);
});

test('the imported recipe saves like a typed one', async () => {
  const calls = [];
  const app = openNewForm(importStub(calls, (url, options) => (
    url.includes('/functions/')
      ? jsonResponse(200, { mode: 'ai', recipe: importedRecipe })
      : jsonResponse(201, [{ id: 5, ...JSON.parse(options.body) }])
  )));
  app.importUrl = 'https://example.com/recipe';
  await app.importRecipe();
  await app.addRecipe();

  assert.equal(app.formError, '');
  const save = calls.find((call) => call.url.includes('/rest/v1/recipes'));
  assert.equal(save.options.method, 'POST');
  assert.equal(save.body.title_sk, 'Zapekané vajcia');
  assert.equal(save.body.gi, 16);
  assert.equal(save.body.sj, 0.4);
  assert.equal(save.body.servings, 3);
  assert.equal(app.recipes[0].id, 5);
});

test('basic mode says the recipe is not translated', async () => {
  const app = openNewForm(importStub([], () => jsonResponse(200, {
    mode: 'basic',
    recipe: { title_sk: 'Egg bake', servings: 6, ingredients: [{ name: 'eggs', amount: '12', unit: '' }] }
  })));
  app.newRecipe.category_sk = 'Raňajky';
  app.importUrl = 'https://example.com/recipe';
  await app.importRecipe();

  assert.equal(app.importMessage, app.t('importDoneBasic'));
  assert.equal(app.newRecipe.title_sk, 'Egg bake');
  // What the user already typed stays when the import has no value for it.
  assert.equal(app.newRecipe.category_sk, 'Raňajky');
});

test('an invalid link is rejected before any request', async () => {
  const calls = [];
  const app = openNewForm(importStub(calls, () => jsonResponse(200, {})));
  app.importUrl = 'not a link';
  await app.importRecipe();

  assert.equal(calls.length, 0);
  assert.equal(app.importError, app.t('importInvalidUrl'));
});

test('function errors are explained', async () => {
  for (const [status, code, key] of [
    [422, 'no_recipe', 'importNoRecipe'],
    [502, 'page_unreachable', 'importPageUnreachable'],
    [502, 'ai_failed', 'importAiFailed'],
    [403, 'forbidden', 'permissionError']
  ]) {
    const app = openNewForm(importStub([], () => jsonResponse(status, { error: code })));
    app.importUrl = 'https://example.com/recipe';
    await app.importRecipe();
    assert.equal(app.importError, `${app.t('importError')} ${app.t(key)}`, code);
    assert.equal(app.newRecipe.title_sk, '');
    assert.equal(app.importing, false);
  }
});

test('a network failure keeps the form and reports the connection', async () => {
  const app = openNewForm(async () => { throw networkError(); });
  app.importUrl = 'https://example.com/recipe';
  await app.importRecipe();
  assert.equal(app.importError, `${app.t('importError')} ${app.t('connectionError')}`);
});

test('a rejected token is refreshed once and the import retried', async () => {
  const calls = [];
  let imports = 0;
  const app = openNewForm(importStub(calls, (url) => {
    if (url.includes('/auth/v1/token')) {
      return jsonResponse(200, { access_token: 'fresh-token', refresh_token: 'r2', expires_in: 3600 });
    }
    imports += 1;
    return imports === 1 ? jsonResponse(401, { error: 'unauthorized' }) : jsonResponse(200, { mode: 'ai', recipe: importedRecipe });
  }));
  app.importUrl = 'https://example.com/recipe';
  await app.importRecipe();

  const importCalls = calls.filter((call) => call.url.includes('/functions/'));
  assert.equal(importCalls.length, 2);
  assert.equal(importCalls[1].options.headers.Authorization, 'Bearer fresh-token');
  assert.equal(app.newRecipe.title_sk, 'Zapekané vajcia');
});

test('opening a new form clears the previous import', async () => {
  const app = openNewForm(importStub([], () => jsonResponse(200, { mode: 'ai', recipe: importedRecipe })));
  app.importUrl = 'https://example.com/recipe';
  await app.importRecipe();
  app.closeForm();
  app.openForm();
  assert.equal(app.importUrl, '');
  assert.equal(app.importMessage, '');
  assert.equal(app.newRecipe.title_sk, '');
});

test('values worked out from the ingredients are flagged as an estimate', async () => {
  const app = openNewForm(importStub([], () => jsonResponse(200, {
    mode: 'ai',
    recipe: { ...importedRecipe, nutrition_from_source: false }
  })));
  app.importUrl = 'https://example.com/recipe';
  await app.importRecipe();
  assert.equal(app.importMessage, `${app.t('importDone')} ${app.t('importNutritionCalculated')}`);
  assert.equal(app.newRecipe.calories, 182);
  assert.equal('nutrition_from_source' in app.newRecipe, false);
});
