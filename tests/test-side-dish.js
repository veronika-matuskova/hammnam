// Main dish and side dish: recipes.side_recipe_id links a main dish to its side.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, signedInSession, supabaseStub, plain } = require('./helpers/app-harness');

const chicken = { id: 4, title_sk: 'Kura na kyslej kapuste', category_sk: 'Obed', side_recipe_id: 5, ingredients: [], steps: [] };
const potatoes = { id: 5, title_sk: 'Gratinované zemiaky', category_sk: 'Príloha', side_recipe_id: null, ingredients: [], steps: [] };
const soup = { id: 6, title_sk: 'Polievka', category_sk: 'Polievky', side_recipe_id: null, ingredients: [], steps: [] };

function appWith(recipes, fetch = supabaseStub(recipes)) {
  const app = loadApp({ fetch, session: signedInSession() });
  app.recipes = recipes.map((recipe) => ({ ...recipe }));
  return app;
}

test('the main dish shows its side, and the side shows its main dish', () => {
  const app = appWith([chicken, potatoes, soup]);
  assert.equal(app.sideRecipe(app.recipes[0]).id, 5);
  assert.equal(app.sideRecipe(app.recipes[1]), null);
  assert.deepEqual(app.mainRecipes(app.recipes[1]).map((recipe) => recipe.id), [4]);
  assert.deepEqual(plain(app.mainRecipes(app.recipes[0])), []);
  assert.deepEqual(plain(app.mainRecipes(app.recipes[2])), []);
});

test('a missing or self-pointing side dish is ignored', () => {
  const app = appWith([{ ...chicken, side_recipe_id: 99 }, { ...soup, side_recipe_id: 6 }]);
  assert.equal(app.sideRecipe(app.recipes[0]), null);
  assert.equal(app.sideRecipe(app.recipes[1]), null);
  assert.deepEqual(plain(app.mainRecipes(app.recipes[1])), []);
});

test('opening the side dish from the main dish, then Back, returns to the main dish', () => {
  const app = appWith([chicken, potatoes]);
  app.recipesLoaded = true;
  // init() wires popstate to syncRoute; do the same without loading anything.
  app.window.addEventListener('popstate', () => app.syncRoute());
  app.openRecipe(app.recipes[0]);
  app.openLinkedRecipe(app.sideRecipe(app.recipes[0]));
  assert.equal(app.selectedRecipe.id, 5);
  assert.equal(app.location.hash, '#recipe/5');
  app.history.back();
  assert.equal(app.selectedRecipe.id, 4);
});

test('the form offers every other recipe as the side dish, and saves the choice as a number', async () => {
  const calls = [];
  const fetch = supabaseStub([chicken, potatoes, soup], calls);
  const app = appWith([chicken, potatoes, soup], fetch);
  app.editRecipe(app.recipes[0]);
  assert.deepEqual(app.sideRecipeOptions.map((option) => option.id), ['5', '6']);
  assert.equal(app.newRecipe.side_recipe_id, 5);

  app.newRecipe.side_recipe_id = '6';
  await app.addRecipe();
  assert.equal(app.formError, '');
  const save = calls.find((call) => call.method === 'PATCH');
  assert.equal(save.body.side_recipe_id, 6);
});

test('no side dish is saved as null, and a recipe cannot be its own side', async () => {
  const calls = [];
  const fetch = supabaseStub([chicken, potatoes], calls);
  const app = appWith([chicken, potatoes], fetch);
  app.editRecipe(app.recipes[0]);
  app.newRecipe.side_recipe_id = '';
  await app.addRecipe();
  assert.equal(calls.find((call) => call.method === 'PATCH').body.side_recipe_id, null);

  app.editRecipe(app.recipes[0]);
  app.newRecipe.side_recipe_id = '4';
  await app.addRecipe();
  assert.equal(calls.filter((call) => call.method === 'PATCH')[1].body.side_recipe_id, null);
});

test('a new recipe starts without a side dish', async () => {
  const calls = [];
  const app = appWith([potatoes], supabaseStub([potatoes], calls));
  app.openForm();
  assert.equal(app.newRecipe.side_recipe_id, null);
  app.newRecipe.title_sk = 'Rezeň';
  app.newRecipe.category_sk = 'Obed';
  app.newRecipe.side_recipe_id = '5';
  await app.addRecipe();
  assert.equal(calls.find((call) => call.method === 'POST').body.side_recipe_id, 5);
});
