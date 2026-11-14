// "Čo uvarím?": a random recipe suggestion, with optional conditions.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, readRepoFile } = require('./helpers/app-harness');

const lib = loadApp().context;

// servings + total_weight give SJ per portion: carbs per 100 g x portion weight / 100 / 10.
const RECIPES = [
  { id: 1, title_sk: 'Šošovicová polievka', category_sk: 'Polievky', gi: 30, carbs: 10, servings: 4, total_weight: 1200, favorite: true },
  { id: 2, title_sk: 'Palacinky', category_sk: 'Dezerty', gi: 75, carbs: 30, servings: 4, total_weight: 800, favorite: false },
  { id: 3, title_sk: 'Kuracie s ryžou', category_sk: 'Hlavné jedlá', gi: 60, carbs: 20, favorite: true },
  { id: 4, title_sk: 'Tekvicová polievka', category_sk: 'Polievky', gi: 'nízky', carbs: 8, servings: 2, total_weight: 600, favorite: false }
];

function appWithRecipes() {
  const app = loadApp();
  app.recipes = RECIPES.map((recipe) => ({ ...recipe }));
  return app;
}

const ids = (recipes) => recipes.map((recipe) => recipe.id);

test('pickSuggestion picks from the candidates using the random source', () => {
  const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.equal(lib.pickSuggestion(list, null, () => 0).id, 1);
  assert.equal(lib.pickSuggestion(list, null, () => 0.5).id, 2);
  assert.equal(lib.pickSuggestion(list, null, () => 0.999).id, 3);
  // A random source returning exactly 1 must not run past the end.
  assert.equal(lib.pickSuggestion(list, null, () => 1).id, 3);
});

test('pickSuggestion never repeats the previous recipe when there is a choice', () => {
  const list = [{ id: 1 }, { id: 2 }];
  for (const value of [0, 0.3, 0.6, 0.99]) {
    assert.equal(lib.pickSuggestion(list, 1, () => value).id, 2);
    assert.equal(lib.pickSuggestion(list, '2', () => value).id, 1);
  }
  // With one candidate the same recipe is fine.
  assert.equal(lib.pickSuggestion([{ id: 1 }], 1, () => 0).id, 1);
});

test('pickSuggestion returns null without candidates', () => {
  assert.equal(lib.pickSuggestion([], null), null);
  assert.equal(lib.pickSuggestion(null, null), null);
});

test('without conditions every recipe is a candidate', () => {
  const app = appWithRecipes();
  assert.deepEqual(ids(app.suggestionCandidates), [1, 2, 3, 4]);
});

test('category, favorites and low GI narrow the candidates', () => {
  const app = appWithRecipes();
  app.suggestionFilters.category = 'Polievky';
  assert.deepEqual(ids(app.suggestionCandidates), [1, 4]);
  app.suggestionFilters.favoritesOnly = true;
  assert.deepEqual(ids(app.suggestionCandidates), [1]);
  app.suggestionFilters = { category: '', favoritesOnly: false, lowGi: true, maxSj: '' };
  // Text GI such as "nízky" has no numeric category, so only GI 30 counts as low.
  assert.deepEqual(ids(app.suggestionCandidates), [1]);
});

test('max SJ per portion keeps recipes at or under the limit and skips unknown portions', () => {
  const app = appWithRecipes();
  // SJ per portion: #1 = 10 x 300 / 100 / 10 = 3, #2 = 30 x 200 / 100 / 10 = 6, #4 = 8 x 300 / 100 / 10 = 2.4, #3 unknown.
  app.suggestionFilters.maxSj = '3';
  assert.deepEqual(ids(app.suggestionCandidates), [1, 4]);
  app.suggestionFilters.maxSj = '2,5';
  assert.deepEqual(ids(app.suggestionCandidates), [4]);
  app.suggestionFilters.maxSj = '1';
  assert.deepEqual(ids(app.suggestionCandidates), []);
});

test('the SJ limit follows the chosen SJ factor', () => {
  const app = appWithRecipes();
  app.setSjFactor(12);
  // #2 = 60 g carbs per portion / 12 = 5 SJ.
  app.suggestionFilters.maxSj = '5';
  assert.deepEqual(ids(app.suggestionCandidates), [1, 2, 4]);
});

test('an invalid SJ limit is flagged and ignored', () => {
  const app = appWithRecipes();
  app.suggestionFilters.maxSj = 'veľa';
  assert.equal(app.suggestionMaxSjInvalid, true);
  assert.equal(app.suggestionMaxSj, null);
  assert.deepEqual(ids(app.suggestionCandidates), [1, 2, 3, 4]);
  app.suggestionFilters.maxSj = '';
  assert.equal(app.suggestionMaxSjInvalid, false);
});

test('opening the panel suggests a recipe right away; another one is different', () => {
  const app = appWithRecipes();
  assert.equal(app.suggestedRecipe, null);
  app.toggleSuggestion();
  assert.equal(app.showSuggestion, true);
  const first = app.suggestedRecipe;
  assert.ok(first);
  for (let i = 0; i < 20; i += 1) {
    const previous = app.suggestedRecipe.id;
    app.suggestRecipe();
    assert.notEqual(app.suggestedRecipe.id, previous);
  }
  app.toggleSuggestion();
  assert.equal(app.showSuggestion, false);
});

test('the suggestion disappears when it no longer meets the conditions', () => {
  const app = appWithRecipes();
  app.suggestedRecipeId = 2;
  assert.equal(app.suggestedRecipe.id, 2);
  app.suggestionFilters.lowGi = true;
  assert.equal(app.suggestedRecipe, null);
  app.suggestRecipe();
  assert.equal(app.suggestedRecipe.id, 1);
});

test('with no matching recipe there is no suggestion', () => {
  const app = appWithRecipes();
  app.suggestionFilters.category = 'Neexistuje';
  app.suggestRecipe();
  assert.equal(app.suggestedRecipe, null);
  assert.equal(app.suggestedRecipeId, null);
});

test('the suggestion reads the current recipe after an edit replaces it', () => {
  const app = appWithRecipes();
  app.suggestedRecipeId = 1;
  app.recipes.splice(0, 1, { ...RECIPES[0], title_sk: 'Nová polievka' });
  assert.equal(app.displayTitle(app.suggestedRecipe), 'Nová polievka');
});

test('index.html has the button and panel for the suggestion', () => {
  const html = readRepoFile('index.html');
  assert.match(html, /@click="toggleSuggestion\(\)"/);
  assert.match(html, /id="suggestion-panel"/);
  assert.match(html, /@click="openRecipe\(suggestedRecipe\)"/);
});
