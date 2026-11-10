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
  return factory();
}

test('new recipes initialize with empty detail fields', () => {
  const app = createRecipeApp();

  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.ingredients)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.steps)), []);
  assert.equal(app.newRecipe.notes, '');
});

test('recipe details open, follow the selected language, and close', () => {
  const app = createRecipeApp();
  const recipe = {
    id: 1,
    title_cs: 'Polévka',
    title_sk: 'Polievka',
    ingredients: [{ name: 'Mrkev', amount: '2', unit: 'ks' }, null],
    steps: ['Nakrájet zeleninu.', '  ']
  };
  app.showForm = true;

  app.openRecipe(recipe);

  assert.equal(app.showForm, false);
  assert.equal(app.selectedRecipe, recipe);
  assert.equal(app.selectedRecipe.id, 1);
  assert.equal(app.displayTitle(app.selectedRecipe), 'Polévka');
  app.language = 'sk';
  assert.equal(app.displayTitle(app.selectedRecipe), 'Polievka');
  assert.deepEqual(JSON.parse(JSON.stringify(app.recipeIngredients(recipe))), [
    { name: 'Mrkev', amount: '2', unit: 'ks' }
  ]);
  assert.equal(app.ingredientMeasure(recipe.ingredients[0]), '2 ks');
  assert.deepEqual(JSON.parse(JSON.stringify(app.recipeSteps(recipe))), ['Nakrájet zeleninu.']);

  app.closeRecipe();
  assert.equal(app.selectedRecipe, null);
});

test('recipe detail routes work when opening a direct link', () => {
  const app = createRecipeApp(undefined, '#recipe/42');
  const recipe = { id: 42, title_cs: 'Koláč' };
  app.recipes = [recipe];

  app.syncRecipeRoute();

  assert.equal(app.selectedRecipe, recipe);
});

test('GI badges use numeric and localized low/medium/high ranges', () => {
  const app = createRecipeApp();

  assert.equal(app.giClass('55'), 'bg-emerald-50 text-emerald-800');
  assert.equal(app.giClass('56'), 'bg-amber-50 text-amber-800');
  assert.equal(app.giClass('70'), 'bg-red-50 text-red-800');
  assert.equal(app.giClass('nízký'), 'bg-emerald-50 text-emerald-800');
  assert.equal(app.giClass('vysoký'), 'bg-red-50 text-red-800');
});

test('the app script URL bypasses stale service worker cache entries', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const serviceWorker = fs.readFileSync('sw.js', 'utf8');

  assert.match(html, /src="\.\/js\/app\.js\?v=2"/);
  assert.match(serviceWorker, /const CACHE_NAME = 'ham-mnam-shell-v2'/);
  assert.match(serviceWorker, /'\.\/js\/app\.js\?v=2'/);
});

test('recipe details render as a dedicated page rather than a modal', () => {
  const html = fs.readFileSync('index.html', 'utf8');

  assert.match(html, /<main x-show="selectedRecipe" x-cloak/);
  assert.match(html, /<button\s+type="button"\s+@click="closeRecipe\(\)"/);
  assert.doesNotMatch(html, /aria-modal="true"[^]*recipe-detail-title/);
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
