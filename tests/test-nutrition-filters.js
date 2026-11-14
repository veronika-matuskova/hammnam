// Min/max filters on the recipe list: calories and SJ per portion, GI and GL.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, plain, readRepoFile } = require('./helpers/app-harness');

// Portion weight = total_weight / servings; values are per 100 g.
const RECIPES = [
  // 200 g portion: 200 kcal, 24 g carbs (2.4 SJ at 10 g, 2 SJ at 12 g).
  { id: 1, title_sk: 'Ovsená kaša', category_sk: 'Raňajky', favorite: true, calories: 100, carbs: 12, total_weight: 800, servings: 4, gi: 55, glycemic_load: 10 },
  // 200 g portion: 250 kcal, 40 g carbs (4 SJ / 3.33 SJ).
  { id: 2, title_sk: 'Kuracie s ryžou', category_sk: 'Obed', favorite: false, calories: 125, carbs: 20, total_weight: 1200, servings: 6, gi: 70, glycemic_load: 20,
    ingredients: [{ name: 'Ryža', amount: '150', unit: 'g' }] },
  // 200 g portion: 100 kcal, 8 g carbs (0.8 SJ / 0.67 SJ).
  { id: 3, title_sk: 'Zeleninový šalát', category_sk: 'Obed', favorite: true, calories: 50, carbs: 4, total_weight: 600, servings: 3, gi: 15, glycemic_load: 1.5 },
  // 400 g portion: 600 kcal, 60 g carbs (6 SJ / 5 SJ). No GI, no GL.
  { id: 4, title_sk: 'Lasagne', category_sk: 'Obed', favorite: false, calories: 150, carbs: 15, total_weight: 2000, servings: 5, gi: '', glycemic_load: null },
  // No servings or weight, so nothing per portion. GI as legacy text, GL as a string.
  { id: 5, title_sk: 'Polievka', category_sk: 'Polievky', favorite: true, calories: 40, carbs: 5, gi: 'nízky', glycemic_load: '2,5' },
  // 100 g portion: 300 kcal, 50 g carbs (5 SJ / 4.17 SJ).
  { id: 6, title_sk: 'Koláč', category_sk: 'Dezerty', favorite: false, calories: 300, carbs: 50, total_weight: 1000, servings: 10, gi: 72, glycemic_load: 30 }
];

function appWithRecipes(storage = {}) {
  const app = loadApp({ storage });
  app.recipes = structuredClone(RECIPES);
  return app;
}

function setFilter(app, field, min = '', max = '') {
  app.nutritionFilters[field] = { min, max };
}

const ids = (app) => app.filteredRecipes.map((recipe) => recipe.id);

test('without any bounds the filters change nothing', () => {
  const app = appWithRecipes();
  assert.equal(app.activeNutritionFilterCount, 0);
  assert.deepEqual(ids(app), [1, 2, 3, 4, 5, 6]);
});

test('filter values are the per-portion values the recipe detail shows', () => {
  const app = appWithRecipes();
  for (const recipe of app.recipes) {
    const { perPortion } = app.recipeNutrition(recipe);
    const values = app.recipeFilterValues(recipe);
    assert.equal(values.calories, perPortion.calories, `calories of ${recipe.id}`);
    assert.equal(values.sj, perPortion.sj, `SJ of ${recipe.id}`);
  }
  assert.deepEqual(plain(app.recipeFilterValues(app.recipes[1])), { calories: 250, sj: 4, gi: 70, gl: 20 });
  assert.deepEqual(plain(app.recipeFilterValues(app.recipes[4])), { calories: null, sj: null, gi: null, gl: 2.5 });
});

test('kcal per portion 100–250 keeps recipes in the range, bounds included', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '100', '250');
  assert.equal(app.activeNutritionFilterCount, 1);
  // 200, 250 (max) and 100 (min) kcal; 600 and 300 are out, 5 has no portion.
  assert.deepEqual(ids(app), [1, 2, 3]);
  setFilter(app, 'calories', '100,5', '249,9');
  assert.deepEqual(ids(app), [1]);
});

test('only a minimum or only a maximum', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '250');
  assert.deepEqual(ids(app), [2, 4, 6]);
  setFilter(app, 'calories', '', '200');
  assert.deepEqual(ids(app), [1, 3]);
});

test('comma and dot decimals both work', () => {
  const app = appWithRecipes();
  setFilter(app, 'gl', '1,5', '2,5');
  assert.deepEqual(ids(app), [3, 5]);
  setFilter(app, 'gl', '1.5', '2.5');
  assert.deepEqual(ids(app), [3, 5]);
  setFilter(app, 'gl', ' 1,6 ', '');
  assert.deepEqual(ids(app), [1, 2, 5, 6]);
});

test('invalid bounds are ignored and flagged', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', 'abc', '-5');
  assert.equal(app.activeNutritionFilterCount, 0);
  assert.deepEqual(ids(app), [1, 2, 3, 4, 5, 6]);
  assert.equal(app.isFilterBoundInvalid('abc'), true);
  assert.equal(app.isFilterBoundInvalid('-5'), true);
  assert.equal(app.isFilterBoundInvalid('1,5'), false);
  assert.equal(app.isFilterBoundInvalid(''), false);
  setFilter(app, 'calories', 'abc', '200');
  assert.deepEqual(ids(app), [1, 3]);
});

test('SJ per portion follows the chosen SJ factor', () => {
  const app = appWithRecipes();
  setFilter(app, 'sj', '', '4,5');
  // 10 g: 2.4, 4, 0.8 match; 6 and 5 SJ do not.
  assert.deepEqual(ids(app), [1, 2, 3]);
  app.setSjFactor(12);
  // 12 g: the cake drops to 4.17 SJ and now matches.
  assert.deepEqual(ids(app), [1, 2, 3, 6]);

  setFilter(app, 'sj', '5', '');
  assert.deepEqual(ids(app), [4]);
  app.setSjFactor(10);
  assert.deepEqual(ids(app), [4, 6]);
});

test('the saved SJ factor is used from the start', () => {
  const app = appWithRecipes({ 'hamMnam-sjFactor': '12' });
  setFilter(app, 'sj', '2', '2');
  assert.deepEqual(ids(app), [1]);
});

test('GI range, bounds included; text GI and missing GI are hidden', () => {
  const app = appWithRecipes();
  setFilter(app, 'gi', '0', '55');
  // Recipe 5 has GI "nízky" (text) and recipe 4 none: both hidden.
  assert.deepEqual(ids(app), [1, 3]);
  setFilter(app, 'gi', '70', '100');
  assert.deepEqual(ids(app), [2, 6]);
  setFilter(app, 'gi', '56', '69,9');
  assert.deepEqual(ids(app), []);
});

test('GL range', () => {
  const app = appWithRecipes();
  setFilter(app, 'gl', '10', '20');
  assert.deepEqual(ids(app), [1, 2]);
  setFilter(app, 'gl', '', '10');
  assert.deepEqual(ids(app), [1, 3, 5]);
});

test('recipes without a value are hidden only while that filter is set', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '0');
  assert.deepEqual(ids(app), [1, 2, 3, 4, 6]);
  setFilter(app, 'calories');
  setFilter(app, 'gi', '0');
  assert.deepEqual(ids(app), [1, 2, 3, 6]);
  setFilter(app, 'gi');
  setFilter(app, 'gl', '0');
  assert.deepEqual(ids(app), [1, 2, 3, 5, 6]);
  setFilter(app, 'gl');
  assert.deepEqual(ids(app), [1, 2, 3, 4, 5, 6]);
});

test('min greater than max is swapped', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '250', '100');
  assert.deepEqual(ids(app), [1, 2, 3]);
  setFilter(app, 'gl', '20', '10');
  assert.deepEqual(ids(app), [1, 2]);
});

test('several nutrition filters combine with AND', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '100', '250');
  setFilter(app, 'gi', '', '55');
  assert.equal(app.activeNutritionFilterCount, 2);
  assert.deepEqual(ids(app), [1, 3]);
  setFilter(app, 'gl', '5');
  assert.equal(app.activeNutritionFilterCount, 3);
  assert.deepEqual(ids(app), [1]);
});

test('nutrition filters combine with search, category and favorites', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '100', '250');
  app.search = 'ryza';
  assert.deepEqual(ids(app), [2]);
  app.search = '';
  app.selectedCategory = 'Obed';
  assert.deepEqual(ids(app), [2, 3]);
  app.favoritesOnly = true;
  assert.deepEqual(ids(app), [3]);
  app.selectedCategory = '';
  assert.deepEqual(ids(app), [1, 3]);
  app.search = 'lasagne';
  assert.deepEqual(ids(app), []);
});

test('reset clears every nutrition filter and keeps the other filters', () => {
  const app = appWithRecipes();
  setFilter(app, 'calories', '100', '250');
  setFilter(app, 'sj', '1');
  setFilter(app, 'gi', '', '60');
  setFilter(app, 'gl', '5', '15');
  app.favoritesOnly = true;
  assert.equal(app.activeNutritionFilterCount, 4);
  assert.deepEqual(ids(app), [1]);
  app.resetNutritionFilters();
  assert.equal(app.activeNutritionFilterCount, 0);
  assert.deepEqual(plain(app.nutritionFilters), {
    calories: { min: '', max: '' }, sj: { min: '', max: '' }, gi: { min: '', max: '' }, gl: { min: '', max: '' }
  });
  assert.equal(app.favoritesOnly, true);
  assert.deepEqual(ids(app), [1, 3, 5]);
});

test('the filter panel is in the list view with decimal inputs and a reset button', () => {
  const html = readRepoFile('index.html');
  assert.match(html, /@click="showNutritionFilters = !showNutritionFilters"/);
  assert.match(html, /x-text="activeNutritionFilterCount"/);
  assert.match(html, /x-model\.trim="nutritionFilters\[filter\.field\]\.min"/);
  assert.match(html, /x-model\.trim="nutritionFilters\[filter\.field\]\.max"/);
  assert.match(html, /@click="resetNutritionFilters\(\)"/);
  const panel = html.slice(html.indexOf('id="nutrition-filters-panel"'));
  assert.equal((panel.slice(0, panel.indexOf('</section>')).match(/inputmode="decimal"/g) || []).length, 2);
  const app = appWithRecipes();
  assert.deepEqual(plain(app.nutritionFilterFields.map((filter) => filter.unit)), ['kcal', 'SJ', 'GI', 'GL']);
  assert.equal(app.t('resetFilters'), 'Zrušiť filtre');
  assert.equal(app.t('nutritionFilters'), 'Filtre');
});

test('kcal and SJ are compared as the detail rounds them', () => {
  const app = loadApp({});
  // 200 g portion: 250.4 kcal (shown "250 kcal") and 20.4 g carbs = 2.04 SJ (shown "2").
  app.recipes = [{ id: 1, calories: 125.2, carbs: 10.2, total_weight: 800, servings: 4 }];
  const { perPortion } = app.recipeNutrition(app.recipes[0], false);
  assert.equal(app.formatAmount(perPortion.calories, 'kcal', 0), '250 kcal');
  assert.equal(app.formatNumber(perPortion.sj), '2');
  setFilter(app, 'calories', '', '250');
  assert.deepEqual(ids(app), [1]);
  setFilter(app, 'calories');
  setFilter(app, 'sj', '2', '2');
  assert.deepEqual(ids(app), [1]);
  // 12 g factor: 20.4 / 12 = 1.7 SJ as shown.
  app.setSjFactor(12);
  setFilter(app, 'sj', '1,7', '1,7');
  assert.deepEqual(ids(app), [1]);
});

test('rounding for the filters matches formatNumber, also at .x5 values', () => {
  const app = loadApp({});
  // 200 g portion with 0.75 g carbs per 100 g: 1.5 g carbs = 0.15 SJ, shown "0,2".
  app.recipes = [{ id: 1, carbs: 0.75, total_weight: 800, servings: 4 }];
  const { perPortion } = app.recipeNutrition(app.recipes[0], false);
  assert.equal(app.formatNumber(perPortion.sj), '0,2');
  setFilter(app, 'sj', '0,2', '0,2');
  assert.deepEqual(ids(app), [1]);
});
