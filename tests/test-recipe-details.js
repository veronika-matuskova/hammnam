const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function createRecipeApp(fetch) {
  let factory;
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
      SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'test-key' }
    },
    console
  };
  vm.runInNewContext(fs.readFileSync('js/app.js', 'utf8'), context);
  return factory();
}

test('new recipes initialize with empty detail fields', () => {
  const app = createRecipeApp();

  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.ingredients)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.steps)), []);
  assert.equal(app.newRecipe.notes, '');
});

test('saving a recipe posts normalized ingredients, steps, and notes', async () => {
  let requestUrl;
  let requestOptions;
  const app = createRecipeApp(async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      status: 201,
      json: async () => [{ id: 1, ...JSON.parse(options.body) }]
    };
  });
  app.newRecipe.title_cs = 'Polévka';
  app.newRecipe.category_cs = 'Oběd';
  app.newRecipe.ingredients = [
    { name: ' Mrkev ', amount: ' 2 ', unit: ' ks ' },
    { name: ' ', amount: '', unit: '' }
  ];
  app.newRecipe.steps = [' Nakrájet zeleninu. ', '  '];
  app.newRecipe.notes = ' Podávat teplé. ';

  await app.addRecipe();

  assert.equal(requestUrl, 'https://example.supabase.co/rest/v1/recipes');
  assert.equal(requestOptions.method, 'POST');
  assert.deepEqual(JSON.parse(requestOptions.body).ingredients, [
    { name: 'Mrkev', amount: '2', unit: 'ks' }
  ]);
  assert.deepEqual(JSON.parse(requestOptions.body).steps, ['Nakrájet zeleninu.']);
  assert.equal(JSON.parse(requestOptions.body).notes, 'Podávat teplé.');
  assert.equal(app.recipes.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.ingredients)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.steps)), []);
  assert.equal(app.newRecipe.notes, '');
});
