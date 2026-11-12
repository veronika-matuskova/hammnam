// Issue #14: per-portion values from per-100 g values, totals, servings and
// portion size; configurable SJ factor; warnings for conflicting values.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('js/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function load(storage = { getItem: () => null, setItem: () => {} }) {
  let factory;
  const context = {
    Alpine: { data(name, registeredFactory) { factory = registeredFactory; } },
    document: { addEventListener(event, callback) { if (event === 'alpine:init') callback(); } },
    localStorage: storage,
    window: { location: { hash: '', pathname: '/', search: '' }, history: {}, addEventListener() {} },
    console: { ...console, warn() {} }
  };
  vm.runInNewContext(source, context);
  return { context, app: factory() };
}

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); }
  };
}

const throwingStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); }
};

const { context: lib } = load();
const plain = (value) => JSON.parse(JSON.stringify(value));
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);

test('per-100 g values x (total weight / servings) give per-portion values', () => {
  const result = lib.computeNutrition({
    per100: { calories: 120, carbs: 15, proteins: 4, fats: 5, fiber: 2, salt: 0.5 },
    totalWeight: 1200,
    servings: 4
  });
  assert.equal(result.portionWeight, 300);
  assert.deepEqual(plain(result.perPortion), {
    calories: 360, carbs: 45, proteins: 12, fats: 15, fiber: 6, salt: 1.5, sj: 4.5
  });
  assert.equal(result.per100.sj, 1.5);
});

test('totals + servings give per-portion values; totals + weight give per-100 g', () => {
  const result = lib.computeNutrition({
    totals: { calories: 1600, carbs: 200, proteins: 40 },
    servings: 4,
    totalWeight: 1000
  });
  assert.equal(result.perPortion.calories, 400);
  assert.equal(result.perPortion.carbs, 50);
  assert.equal(result.perPortion.sj, 5);
  assert.equal(result.per100.calories, 160);
  assert.equal(result.per100.carbs, 20);
  assert.equal(result.per100.sj, 2);
  assert.equal(result.per100.fats, null);
  assert.equal(result.perPortion.fats, null);

  const noWeight = lib.computeNutrition({ totals: { carbs: 90 }, servings: 3 });
  assert.equal(noWeight.portionWeight, null);
  assert.equal(noWeight.perPortion.carbs, 30);
  assert.equal(noWeight.per100.carbs, null);
});

test('totals + total weight + a portion size in grams', () => {
  const result = lib.computeNutrition({ totals: { carbs: 150, calories: 900 }, totalWeight: 1500, portionWeight: 250 });
  assert.equal(result.portionWeight, 250);
  assert.equal(result.perPortion.carbs, 25);
  assert.equal(result.perPortion.calories, 150);
  near(result.perPortion.sj, 2.5, 'sj');
  // A custom portion without any weight basis cannot use totals / servings.
  const unknown = lib.computeNutrition({ totals: { carbs: 150 }, servings: 5, portionWeight: 250 });
  assert.equal(unknown.perPortion.carbs, null);
});

test('a custom portion size overrides total weight / servings', () => {
  const result = lib.computeNutrition({ per100: { carbs: 20 }, totalWeight: 1000, servings: 4, portionWeight: '150,5' });
  assert.equal(result.portionWeight, 150.5);
  near(result.perPortion.carbs, 30.1, 'carbs');
});

test('missing, zero, negative and invalid inputs never produce NaN or Infinity', () => {
  const cases = [
    {},
    { per100: { carbs: 20 }, servings: 0, totalWeight: 1000 },
    { per100: { carbs: 20 }, servings: 4, totalWeight: 0 },
    { per100: { carbs: 'abc' }, servings: '-2', totalWeight: 'x' },
    { totals: { carbs: 100 }, servings: 0 },
    { totals: { carbs: -5 }, servings: 2, totalWeight: 500 },
    { per100: { carbs: null, calories: undefined }, totals: null, servings: null, totalWeight: null }
  ];
  for (const input of cases) {
    const result = lib.computeNutrition(input);
    for (const group of [result.per100, result.perPortion]) {
      for (const [field, value] of Object.entries(group)) {
        assert.ok(value === null || Number.isFinite(value), `${field} = ${value} for ${JSON.stringify(input)}`);
      }
    }
  }
  const zeroServings = lib.computeNutrition({ per100: { carbs: 20 }, servings: 0, totalWeight: 1000 });
  assert.equal(zeroServings.portionWeight, null);
  assert.equal(zeroServings.perPortion.carbs, null);
  assert.equal(zeroServings.per100.carbs, 20);
  // Zero carbs are a real value (0 SJ), not missing.
  const zeroCarbs = lib.computeNutrition({ per100: { carbs: 0 }, servings: 2, totalWeight: 400 });
  assert.equal(zeroCarbs.perPortion.carbs, 0);
  assert.equal(zeroCarbs.perPortion.sj, 0);
});

test('string values from the form or the API are parsed with comma or dot', () => {
  const result = lib.computeNutrition({ per100: { carbs: '12,5' }, servings: '2', totalWeight: '400.0' });
  assert.equal(result.perPortion.carbs, 25);
  assert.equal(result.perPortion.sj, 2.5);
});

test('without carbs, the entered SJ per 100 g is scaled to the portion', () => {
  const result = lib.computeNutrition({ per100: { sj: 1.2 }, servings: 2, totalWeight: 500 });
  assert.equal(result.per100.sj, 1.2);
  near(result.perPortion.sj, 3, 'sj');
});

test('SJ factor: 10 g by default, 12 g on request, anything else falls back to 10 g', () => {
  assert.equal(lib.carbsToSj(36), 3.6);
  assert.equal(lib.carbsToSj(36, 12), 3);
  assert.equal(lib.carbsToSj(36, '12'), 3);
  assert.equal(lib.carbsToSj(36, 7), 3.6);
  assert.equal(lib.carbsToSj(null, 12), null);
  assert.equal(lib.normalizeSjFactor(undefined), 10);
  assert.equal(lib.normalizeSjFactor('abc'), 10);
  const result = lib.computeNutrition({ per100: { carbs: 24 }, servings: 2, totalWeight: 500 }, 12);
  assert.equal(result.per100.sj, 2);
  assert.equal(result.perPortion.sj, 5);
});

test('SJ factor is read from and saved to localStorage', () => {
  const storage = memoryStorage({ 'hamMnam-sjFactor': '12' });
  const { app } = load(storage);
  assert.equal(app.sjFactor, 12);
  app.setSjFactor('10');
  assert.equal(app.sjFactor, 10);
  assert.equal(storage.data['hamMnam-sjFactor'], '10');
  app.setSjFactor(99);
  assert.equal(app.sjFactor, 10);

  const { app: fresh } = load(memoryStorage());
  assert.equal(fresh.sjFactor, 10);
  const { app: tampered } = load(memoryStorage({ 'hamMnam-sjFactor': '15' }));
  assert.equal(tampered.sjFactor, 10);
});

test('an unavailable localStorage does not break the SJ factor', () => {
  const { app } = load(throwingStorage);
  assert.equal(app.sjFactor, 10);
  assert.doesNotThrow(() => app.setSjFactor(12));
  assert.equal(app.sjFactor, 12);
});

test('conflict detection: SJ vs carbs with a rounding tolerance', () => {
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { carbs: 12.3, sj: 1.2 } })), []);
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { carbs: 20, sj: 2.1 } })), []);
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { carbs: 20 } })), []);
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { sj: 2 } })), []);
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { carbs: 20, sj: 4 } })), [
    { field: 'sj', entered: 4, computed: 2 }
  ]);
});

test('conflict detection names the other SJ factor when it matches', () => {
  const conflicts = plain(lib.detectNutritionConflicts({ per100: { carbs: 24, sj: 2 } }, 10));
  assert.deepEqual(conflicts, [{ field: 'sj', entered: 2, computed: 2.4, matchingFactor: 12 }]);
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { carbs: 24, sj: 2 } }, 12)), []);
});

test('conflict detection: per-100 g values vs totals / total weight', () => {
  const conflicts = plain(lib.detectNutritionConflicts({
    per100: { calories: 150, carbs: 20, proteins: 3 },
    totals: { calories: 1500, carbs: 300, proteins: 30.4 },
    totalWeight: 1000
  }));
  assert.deepEqual(conflicts, [{ field: 'carbs', entered: 20, computed: 30 }]);
  // No total weight: nothing to compare against.
  assert.deepEqual(plain(lib.detectNutritionConflicts({ per100: { carbs: 20 }, totals: { carbs: 300 } })), []);
});

test('the app computes per-portion values for a stored recipe and a card', () => {
  const { app } = load();
  const recipe = { id: 1, carbs: 15, sj: 1.5, calories: 100, servings: 4, total_weight: 800 };
  assert.equal(app.recipePortionSj(recipe), 3);
  assert.equal(app.recipeNutrition(recipe).perPortion.calories, 200);
  assert.ok(app.hasPortionValues(recipe));
  app.portionSizeInput = '100';
  assert.equal(app.recipeNutrition(recipe).perPortion.calories, 100);
  assert.equal(app.recipePortionSj(recipe), 3, 'cards ignore the custom portion');
  app.portionSizeInput = 'abc';
  assert.equal(app.recipeNutrition(recipe).portionWeight, 200);
  assert.equal(app.recipePortionSj({ id: 2, carbs: 15 }), null);
  assert.equal(app.hasPortionValues({ id: 2, carbs: 15 }), false);
});

test('the app shows a form warning while the entered SJ does not match carbs', () => {
  const { app } = load();
  app.newRecipe = { ...app.newRecipe, carbs: '24', sj: '2' };
  assert.equal(app.formNutritionConflicts.length, 1);
  assert.equal(
    app.conflictMessage(app.formNutritionConflicts[0]),
    'Zadané SJ na 100 g (2) nezodpovedajú sacharidom: pri 1 SJ = 10 g vychádza 2,4 SJ. '
      + 'Zadaná hodnota zodpovedá prepočtu 1 SJ = 12 g.'
  );
  app.setSjFactor(12);
  assert.equal(app.formNutritionConflicts.length, 0);
  app.setSjFactor(10);
  app.newRecipe.sj = '2,4';
  assert.equal(app.formNutritionConflicts.length, 0);
  app.newRecipe.sj = 'abc';
  assert.equal(app.formNutritionConflicts.length, 0, 'invalid input is reported by the save check, not here');
});

test('numbers are formatted for the UI language', () => {
  const { app } = load();
  assert.equal(app.formatNumber(2.45), '2,5');
  assert.equal(app.formatAmount(1234.5, 'g', 0), '1 235 g'.replace(' ', ' '));
  assert.equal(app.formatAmount(null, 'g'), '—');
  assert.equal(app.formatNumber(NaN), '—');
});

test('new texts exist in Slovak and Czech', () => {
  const { app } = load();
  const keys = ['portionHeading', 'portionNote', 'portionWeight', 'customPortion', 'customPortionHint',
    'portionUnavailable', 'sjPerPortion', 'perPortionSuffix', 'sjFactor', 'sjFactorOption',
    'conflictTitle', 'conflictSj', 'conflictSjOtherFactor'];
  for (const language of ['sk', 'cs']) {
    app.language = language;
    for (const key of keys) assert.notEqual(app.t(key), key, `${language}.${key} missing`);
  }
  app.language = 'cs';
  assert.equal(app.t('perPortionSuffix'), '/porce');
  app.language = 'sk';
  assert.equal(app.t('perPortionSuffix'), '/porcia');
});

test('the detail page has a per-portion block without GI/GL, and SJ outside the macro list', () => {
  const portion = html.slice(html.indexOf('id="detail-portion-heading"'), html.indexOf('aria-labelledby="detail-nutrition-heading"'));
  assert.ok(portion.length > 0);
  assert.doesNotMatch(portion, /\bgi\b|glycemic|glycemicLoad/i);
  assert.match(portion, /t\('sjPerPortion'\)/);
  const macros = portion.slice(portion.indexOf('<dl'), portion.indexOf('</dl>'));
  assert.match(macros, /'calories', 'kcal'/);
  assert.doesNotMatch(macros, /'sj'|sjPerPortion/);
  assert.match(portion, /nutritionConflicts\(selectedRecipe\)/);
  assert.match(portion, /setSjFactor\(\$event\.target\.value\)/);
});

test('recipe cards show SJ per portion only when it can be computed', () => {
  const start = html.indexOf('<template x-for="recipe in filteredRecipes"');
  const cards = html.slice(start, html.indexOf('</template>', start));
  assert.match(cards, /x-show="recipePortionSj\(recipe\) !== null"/);
  assert.match(cards, /t\('perPortionSuffix'\)/);
});

test('the form shows the conflict warning', () => {
  const form = html.slice(html.indexOf('<main x-show="showForm"'), html.indexOf('<footer'));
  assert.match(form, /x-show="formNutritionConflicts\.length"/);
});
