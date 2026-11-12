const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function createRecipeApp(fetch, initialHash = '') {
  let factory;
  const location = { hash: initialHash, pathname: '/', search: '' };
  const history = {
    state: null,
    pushState(state, title, url) {
      this.state = state;
      location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
    },
    replaceState(state, title, url) {
      this.state = state;
      location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
    },
    back() {
      this.state = null;
      location.hash = '';
    }
  };
  const context = {
    Alpine: {
      data(name, registeredFactory) {
        assert.equal(name, 'recipeApp');
        factory = registeredFactory;
      }
    },
    document: {
      addEventListener(event, callback) {
        if (event === 'alpine:init') callback();
      }
    },
    fetch,
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {
      SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'test-key' },
      location,
      history,
      addEventListener() {}
    },
    console
  };
  vm.runInNewContext(fs.readFileSync('js/app.js', 'utf8'), context);
  return Object.assign(factory(), { location, history });
}

function stubFetch(calls, responseFor = (options) => [{ id: 99, ...JSON.parse(options.body) }]) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: true, status: options.method === 'POST' ? 201 : 200, json: async () => responseFor(options) };
  };
}

const legacyRecipe = {
  id: 7,
  title_cs: 'Koláč',
  title_sk: null,
  category_cs: 'Dezert',
  category_sk: null,
  photo: null,
  gi: null,
  notes: null,
  servings: null,
  ingredients: [{ name: 'Múka', amount: null, unit: null }, null, { name: null, amount: 0, unit: 'g' }],
  steps: ['Upiecť.', null],
  favorite: false,
  created_at: '2026-01-01'
};

test('#7: editing a recipe with NULL text fields saves and resets saving', async () => {
  const calls = [];
  const app = createRecipeApp(stubFetch(calls));
  app.recipes = [{ ...legacyRecipe }];

  app.editRecipe(app.recipes[0]);
  assert.equal(app.newRecipe.notes, '');
  assert.equal(app.newRecipe.photo, '');
  assert.equal(app.newRecipe.gi, '');

  await app.addRecipe();

  assert.equal(app.saving, false);
  assert.equal(app.formError, '');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'PATCH');
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.notes, '');
  assert.equal(payload.photo, '');
  assert.equal(payload.gi, null);
  assert.equal(payload.title_sk, 'Koláč');
  assert.equal(payload.category_sk, 'Dezert');
  assert.deepEqual(payload.ingredients, [
    { name: 'Múka', amount: '', unit: '' },
    { name: '', amount: '0', unit: 'g' }
  ]);
  assert.deepEqual(payload.steps, ['Upiecť.']);
  assert.equal(app.showForm, false);
});

test('#7: null text fields set directly on the form are normalised in the payload', async () => {
  const calls = [];
  const app = createRecipeApp(stubFetch(calls));
  app.newRecipe = {
    ...app.newRecipe,
    title_sk: ' Polievka ',
    category_sk: 'Obed',
    title_cs: null,
    category_cs: null,
    photo: null,
    gi: null,
    notes: null,
    ingredients: [{ name: null, amount: null, unit: null }, null, { name: ' Mrkva ', amount: 2, unit: null }],
    steps: [null, ' Uvariť. ', undefined]
  };

  await app.addRecipe();

  assert.equal(app.saving, false);
  assert.equal(app.formError, '');
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.title_sk, 'Polievka');
  assert.equal(payload.title_cs, '');
  assert.equal(payload.category_cs, '');
  assert.equal(payload.photo, '');
  assert.equal(payload.gi, null);
  assert.equal(payload.notes, '');
  assert.deepEqual(payload.ingredients, [{ name: 'Mrkva', amount: '2', unit: '' }]);
  assert.deepEqual(payload.steps, ['Uvariť.']);
});

test('#7: a failure while building the payload shows an error and resets saving', async () => {
  const calls = [];
  const app = createRecipeApp(stubFetch(calls));
  app.newRecipe = { ...app.newRecipe, title_sk: 'X', category_sk: 'Y' };
  Object.defineProperty(app.newRecipe, 'notes', { get() { throw new Error('boom'); }, enumerable: true });

  await app.addRecipe();

  assert.equal(app.saving, false);
  assert.equal(app.formError, 'Recept sa nepodarilo uložiť. Nastala neočakávaná chyba. Skúste to znova.');
  assert.doesNotMatch(app.formError, /boom/);
  assert.equal(calls.length, 0);
});

test('#8: edit -> cancel -> new recipe starts from an empty form', () => {
  const app = createRecipeApp(stubFetch([]));
  const recipe = { id: 42, title_sk: 'Koláč', category_sk: 'Dezert', notes: 'Teplé.', steps: ['Upiecť.'], ingredients: [{ name: 'Jablká', amount: '3', unit: 'ks' }] };
  app.recipes = [recipe];

  app.openRecipe(recipe);
  app.editRecipe(recipe);
  assert.equal(app.newRecipe.title_sk, 'Koláč');

  app.closeForm();
  app.closeRecipe();
  app.openForm();

  assert.equal(app.showForm, true);
  assert.equal(app.editingRecipeId, null);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe)), JSON.parse(JSON.stringify(createRecipeApp().newRecipe)));
});

test('#8: opening the new form after a browser-back from edit is still empty and POSTs', async () => {
  const calls = [];
  const app = createRecipeApp(stubFetch(calls));
  const recipe = { id: 42, title_sk: 'Koláč', category_sk: 'Dezert', notes: 'Teplé.' };
  app.recipes = [recipe];

  app.editRecipe(recipe);
  // Simulate the browser Back button: the hash changes without closeForm().
  app.location.hash = '';
  app.syncRoute();
  app.openForm();

  assert.equal(app.newRecipe.title_sk, '');
  assert.equal(app.newRecipe.notes, '');
  app.newRecipe.title_sk = 'Nový';
  app.newRecipe.category_sk = 'Obed';
  await app.addRecipe();
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(app.recipes.length, 2);
});
