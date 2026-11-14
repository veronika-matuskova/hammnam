// Scaling ingredient amounts in the recipe detail to a chosen number of servings.
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, readRepoFile } = require('./helpers/app-harness');

const app = loadApp();
const lib = app.context;
// Plain formatter so the pure helpers can be checked without Intl.
const fmt = (value) => String(value);

test('parseAmount reads numbers, decimals with a comma, fractions and ranges', () => {
  const cases = {
    '250': [250],
    '1,5': [1.5],
    '0.25': [0.25],
    '.5': [0.5],
    '½': [0.5],
    '1½': [1.5],
    '1 ½': [1.5],
    '1/2': [0.5],
    '1 1/2': [1.5],
    '2-3': [2, 3],
    '2 – 3': [2, 3],
    '½-1': [0.5, 1]
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.deepEqual([...lib.parseAmount(input)], expected, input);
  }
});

test('parseAmount returns null for text that is not a quantity', () => {
  for (const input of ['', '   ', null, undefined, 'podľa chuti', 'štipka', '2 až 3', '1/0', '-2', 'abc-def']) {
    assert.equal(lib.parseAmount(input), null, String(input));
  }
});

test('scaleAmount multiplies and rounds coarser for bigger amounts', () => {
  assert.equal(lib.scaleAmount('250', 2, fmt), '500');
  assert.equal(lib.scaleAmount('250', 1.5, fmt), '375');
  assert.equal(lib.scaleAmount('100', 1 / 3, fmt), '33');
  assert.equal(lib.scaleAmount('1,5', 1.5, fmt), '2.3');
  assert.equal(lib.scaleAmount('0.25', 1.5, fmt), '0.38');
  assert.equal(lib.scaleAmount('2-3', 2, fmt), '4–6');
});

test('scaleAmount keeps the original text when it cannot or need not scale', () => {
  assert.equal(lib.scaleAmount('podľa chuti', 2, fmt), 'podľa chuti');
  assert.equal(lib.scaleAmount(' 250 ', 1, fmt), '250');
  assert.equal(lib.scaleAmount('250', 0, fmt), '250');
  assert.equal(lib.scaleAmount(null, 2, fmt), '');
});

test('detail starts at the recipe servings and scales measures with the stepper', () => {
  const instance = loadApp();
  const recipe = { id: 3, servings: 2 };
  const cheese = { name: 'cottage cheese', amount: '250', unit: 'g' };
  const pepper = { name: 'čierne korenie', amount: '', unit: 'podľa chuti' };

  assert.equal(instance.ingredientServings(recipe), 2);
  assert.equal(instance.isIngredientScaled(recipe), false);
  assert.equal(instance.scaledIngredientMeasure(recipe, cheese), '250 g');

  instance.changeIngredientServings(recipe, 1);
  instance.changeIngredientServings(recipe, 1);
  assert.equal(instance.ingredientServings(recipe), 4);
  assert.equal(instance.isIngredientScaled(recipe), true);
  assert.equal(instance.scaledIngredientMeasure(recipe, cheese), '500 g');
  assert.equal(instance.scaledIngredientMeasure(recipe, pepper), 'podľa chuti');

  instance.resetIngredientServings();
  assert.equal(instance.ingredientServings(recipe), 2);
});

test('chosen servings apply only to that recipe and stay between 1 and 99', () => {
  const instance = loadApp();
  const first = { id: 1, servings: 4 };
  const second = { id: 2, servings: 3 };

  instance.setIngredientServings(first, 0);
  assert.equal(instance.ingredientServings(first), 1);
  instance.changeIngredientServings(first, -1);
  assert.equal(instance.ingredientServings(first), 1);
  instance.setIngredientServings(first, 500);
  assert.equal(instance.ingredientServings(first), 99);
  instance.setIngredientServings(first, 'abc');
  assert.equal(instance.ingredientServings(first), 99);

  assert.equal(instance.ingredientServings(second), 3, 'another recipe keeps its own servings');
});

test('recipes without servings scale from 1 serving', () => {
  const instance = loadApp();
  const recipe = { id: 5, servings: null };
  assert.equal(instance.recipeBaseServings(recipe), 1);
  instance.setIngredientServings(recipe, 3);
  assert.equal(instance.scaledIngredientMeasure(recipe, { amount: '2', unit: 'ks' }), '6 ks');
});

test('the detail uses the scaled measure and has the servings stepper', () => {
  const html = readRepoFile('index.html');
  assert.match(html, /scaledIngredientMeasure\(selectedRecipe, ingredient\)/);
  assert.match(html, /changeIngredientServings\(selectedRecipe, -1\)/);
  assert.match(html, /changeIngredientServings\(selectedRecipe, 1\)/);
  assert.match(html, /resetIngredientServings\(\)/);
});

test('scaling texts exist in every language', () => {
  const translations = vm.runInContext('translations', lib);
  for (const language of ['sk', 'cs']) {
    for (const key of ['scaleServings', 'scaleServingsUnit', 'fewerServings', 'moreServings', 'scaledFrom', 'resetServings']) {
      assert.ok(translations[language][key], `${language}.${key}`);
    }
  }
});
