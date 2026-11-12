const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, plain, readRepoFile } = require('./helpers/app-harness');

function createRecipeApp(fetch, hash = '') {
  return loadApp({ fetch, hash });
}

function recordingFetch(requests) {
  return async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    requests.push({ url, method: options.method || 'GET', body });
    return { ok: true, status: 201, json: async () => [{ id: 1, ...body }] };
  };
}

test('parseDecimal handles the documented inputs (#9 table: "", " ", "1,5", -1, "0x10")', () => {
  const { parseDecimal } = createRecipeApp().context;
  const cases = [
    // [input, valid, value]
    ['1.5', true, 1.5],
    ['1,5', true, 1.5],
    [' 2,25 ', true, 2.25],
    ['0.05', true, 0.05],
    ['12.5', true, 12.5],
    ['0', true, 0],
    ['42', true, 42],
    ['3.', true, 3],
    [',5', true, 0.5],
    ['', true, null],
    [' ', true, null],
    ['   ', true, null],
    ['\t\n', true, null],
    [null, true, null],
    [undefined, true, null],
    [0, true, 0],
    [7.5, true, 7.5],
    ['abc', false, null],
    ['0x10', false, null],
    ['-1', false, null],
    ['-0,5', false, null],
    [-1, false, null],
    [-2, false, null],
    ['+1', false, null],
    ['1 000', false, null],
    ['1,5,', false, null],
    [Number.POSITIVE_INFINITY, false, null],
    ['1e3', false, null],
    ['1,000.5', false, null],
    ['1.2.3', false, null],
    ['Infinity', false, null],
    [Number.NaN, false, null]
  ];
  for (const [input, valid, value] of cases) {
    assert.deepEqual(plain(parseDecimal(input)), { valid, value }, `input ${JSON.stringify(input)}`);
  }
});

test('saving accepts comma and dot decimals and sends numbers', async () => {
  const requests = [];
  const app = createRecipeApp(recordingFetch(requests));
  app.newRecipe = {
    ...app.newRecipe,
    title_sk: 'Test', category_sk: 'Test',
    calories: '12,5', salt: '0.05', sj: ' 2,25 ', servings: '4', total_weight: '', fats: 0
  };

  await app.addRecipe();

  assert.equal(app.formError, '');
  assert.equal(requests.length, 1);
  const body = requests[0].body;
  assert.equal(body.calories, 12.5);
  assert.equal(body.salt, 0.05);
  assert.equal(body.sj, 2.25);
  assert.equal(body.servings, 4);
  assert.equal(body.total_weight, null);
  assert.equal(body.fats, 0);
  assert.equal(body.carbs, null);
});

test('invalid numbers show a translated form error and nothing is sent', async () => {
  for (const bad of ['abc', '0x10', '-1']) {
    const requests = [];
    const app = createRecipeApp(recordingFetch(requests));
    app.newRecipe = { ...app.newRecipe, title_sk: 'Test', category_sk: 'Test', salt: bad, total_weight: '1,5' };

    await app.addRecipe();

    assert.equal(requests.length, 0, `no request for ${bad}`);
    assert.equal(app.saving, false);
    assert.ok(app.formError.startsWith(app.t('invalidNumber')), app.formError);
    assert.ok(app.formError.includes(app.t('salt')), app.formError);
    assert.ok(!app.formError.includes(app.t('totalWeight')), app.formError);
  }
});

test('invalidNumber is translated in both locales', () => {
  const app = createRecipeApp();
  assert.notEqual(app.t('invalidNumber'), 'invalidNumber');
  app.language = 'cs';
  assert.notEqual(app.t('invalidNumber'), 'invalidNumber');
});

test('editing keeps zero ingredient amounts and drops null steps', () => {
  const app = createRecipeApp();
  app.loadRecipeForEditing({
    id: 9,
    title_sk: 'Test',
    ingredients: [
      { name: 'Soľ', amount: 0, unit: 'g' },
      { name: 'Voda', amount: null, unit: 'ml' },
      { name: 'Múka', amount: 1.5, unit: 'kg' }
    ],
    steps: ['Zmiešať', null, 'Upiecť']
  });

  assert.deepEqual(plain(app.newRecipe.ingredients), [
    { name: 'Soľ', amount: '0', unit: 'g' },
    { name: 'Voda', amount: '', unit: 'ml' },
    { name: 'Múka', amount: '1.5', unit: 'kg' }
  ]);
  assert.deepEqual(plain(app.newRecipe.steps), ['Zmiešať', 'Upiecť']);
});

test('number inputs use text with a decimal keyboard so commas are not mangled', () => {
  const html = readRepoFile('index.html');
  assert.equal((html.match(/type="number"/g) || []).length, 0);
  assert.equal((html.match(/x-model\.number/g) || []).length, 0);
  assert.equal((html.match(/inputmode="decimal"/g) || []).length, 10);
});

test('every numeric field is parsed on save and has a translated error label', async () => {
  const numericFields = Object.entries(createRecipeApp().newRecipe)
    .filter(([, value]) => value === null)
    .map(([field]) => field);
  assert.ok(numericFields.length >= 10, numericFields.join(','));

  for (const field of numericFields) {
    const requests = [];
    const app = createRecipeApp(recordingFetch(requests));
    app.newRecipe = { ...app.newRecipe, title_sk: 'Test', category_sk: 'Test', [field]: '1,5' };
    await app.addRecipe();
    assert.equal(requests[0].body[field], 1.5, `${field}: "1,5" should be saved as 1.5`);

    const rejected = [];
    const bad = createRecipeApp(recordingFetch(rejected));
    bad.newRecipe = { ...bad.newRecipe, title_sk: 'Test', category_sk: 'Test', [field]: '0x10' };
    await bad.addRecipe();
    assert.equal(rejected.length, 0, `${field}: "0x10" should not be sent`);
    const label = bad.formError.slice(bad.t('invalidNumber').length).trim();
    assert.notEqual(label, field, `${field}: error label is the raw field name`);
    assert.doesNotMatch(label, /^[a-z]+[A-Z_]/, `${field}: error label looks like a translation key: ${label}`);
  }
});
