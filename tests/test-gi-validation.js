// Issue #15: numeric GI (0-100) with a derived low/medium/high category, at least one
// title (SK or CZ), and translated error messages with technical details in the console only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('js/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function createRecipeApp(fetch = async () => ({ ok: true, status: 200, json: async () => [] })) {
  let factory;
  const logged = [];
  const context = {
    Alpine: { data(name, registeredFactory) { factory = registeredFactory; } },
    document: { addEventListener(event, callback) { if (event === 'alpine:init') callback(); } },
    fetch,
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {
      SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'test-key' },
      location: { hash: '', pathname: '/', search: '' },
      history: { state: null, pushState() {}, replaceState() {}, back() {} },
      addEventListener() {}
    },
    Intl,
    console: { ...console, error: (...args) => logged.push(args), warn: () => {} }
  };
  vm.runInNewContext(source, context);
  return { app: factory(), context, logged };
}

function recordingFetch(requests, status = 201) {
  return async (url, options = {}) => {
    requests.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    return { ok: true, status, json: async () => [{ id: 1, ...JSON.parse(options.body || '{}') }] };
  };
}

function httpError(status, text = '{"code":"PGRST","message":"secret detail"}') {
  return async () => ({ ok: false, status, text: async () => text, json: async () => ({}) });
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test('parseGi accepts numbers from 0 to 100 and rejects everything else', () => {
  const { context } = createRecipeApp();
  const cases = [
    ['', true, null], [null, true, null], [undefined, true, null], ['  ', true, null],
    ['0', true, 0], ['55', true, 55], [' 45,5 ', true, 45.5], ['100', true, 100], [70, true, 70],
    ['100.1', false, null], ['101', false, null], ['-1', false, null], [-5, false, null],
    ['nízky', false, null], ['55 (nízky)', false, null], ['1e2', false, null], [Number.NaN, false, null]
  ];
  for (const [input, valid, value] of cases) {
    assert.deepEqual(plain(context.parseGi(input)), { valid, value }, `input ${JSON.stringify(input)}`);
  }
});

test('GI category is derived from the number: low <= 55, medium 56-69, high >= 70', () => {
  const { app } = createRecipeApp();
  const cases = [[0, 'low'], ['55', 'low'], ['55,5', 'medium'], [56, 'medium'], ['69', 'medium'],
    ['69.9', 'medium'], ['70', 'high'], [100, 'high'], ['', null], [null, null], ['nízky', null], ['vysoký', null]];
  for (const [input, category] of cases) {
    assert.equal(app.giCategory(input), category, `input ${JSON.stringify(input)}`);
  }
  assert.equal(app.giClass(40), 'bg-emerald-50 text-emerald-800');
  assert.equal(app.giClass('60'), 'bg-amber-50 text-amber-800');
  assert.equal(app.giClass(85), 'bg-red-50 text-red-800');
  assert.equal(app.giClass('low'), 'bg-slate-100 text-slate-700');
  assert.equal(app.giClass(null), 'bg-slate-100 text-slate-700');
});

test('GI labels are translated in Slovak and Czech', () => {
  const { app } = createRecipeApp();
  assert.equal(app.giLabel(30), 'Nízky GI');
  assert.equal(app.giLabel(60), 'Stredný GI');
  assert.equal(app.giLabel(90), 'Vysoký GI');
  assert.equal(app.giLabel('nízky'), '');
  app.language = 'cs';
  assert.equal(app.giLabel(30), 'Nízký GI');
  assert.equal(app.giLabel(60), 'Střední GI');
  assert.equal(app.giLabel(90), 'Vysoký GI');
});

test('legacy free-text GI values still display', () => {
  const { app } = createRecipeApp();
  assert.equal(app.displayGi(55), 55);
  assert.equal(app.displayGi('45,5'), 45.5);
  assert.equal(app.displayGi(' nízky '), 'nízky');
  assert.equal(app.displayGi(null), '—');
  assert.equal(app.displayGi(''), '—');
});

test('GI is saved as a number, or null when empty', async () => {
  for (const [input, expected] of [['55', 55], ['45,5', 45.5], ['', null], [null, null], [0, 0]]) {
    const requests = [];
    const { app } = createRecipeApp(recordingFetch(requests));
    app.newRecipe = { ...app.newRecipe, title_sk: 'Test', category_sk: 'Test', gi: input };
    await app.addRecipe();
    assert.equal(app.formError, '');
    assert.equal(requests[0].body.gi, expected, `input ${JSON.stringify(input)}`);
  }
});

test('an out-of-range or text GI shows a translated error and nothing is sent', async () => {
  for (const bad of ['101', '-3', 'nízky', '55 %']) {
    const requests = [];
    const { app } = createRecipeApp(recordingFetch(requests));
    app.newRecipe = { ...app.newRecipe, title_sk: 'Test', gi: bad };
    await app.addRecipe();
    assert.equal(requests.length, 0, `no request for ${bad}`);
    assert.equal(app.saving, false);
    assert.equal(app.formError, 'Glykemický index musí byť číslo od 0 do 100.');
    assert.equal(app.isGiInvalid(bad), true);
  }
});

test('GI and other invalid numbers are reported together', async () => {
  const requests = [];
  const { app } = createRecipeApp(recordingFetch(requests));
  app.newRecipe = { ...app.newRecipe, title_sk: 'Test', salt: 'x', gi: '150' };
  await app.addRecipe();
  assert.equal(requests.length, 0);
  assert.ok(app.formError.startsWith(app.t('invalidNumber')), app.formError);
  assert.ok(app.formError.includes(app.t('salt')));
  assert.ok(app.formError.endsWith(app.t('giInvalid')));
});

test('editing a recipe with a legacy text GI keeps the text visible and asks for a number', async () => {
  const requests = [];
  const { app } = createRecipeApp(recordingFetch(requests, 200));
  app.loadRecipeForEditing({ id: 3, title_sk: 'Kaša', gi: 'nízky' });
  assert.equal(app.newRecipe.gi, 'nízky');
  await app.addRecipe();
  assert.equal(requests.length, 0);
  assert.equal(app.formError, app.t('giInvalid'));

  app.loadRecipeForEditing({ id: 4, title_sk: 'Kaša', gi: 42 });
  assert.equal(app.newRecipe.gi, '42');
});

test('at least one title is required, Slovak or Czech', async () => {
  const cases = [
    [{ title_sk: '', title_cs: '' }, false],
    [{ title_sk: '   ', title_cs: null }, false],
    [{ title_sk: 'Polievka', title_cs: '' }, true],
    [{ title_sk: '', title_cs: 'Polévka' }, true]
  ];
  for (const [titles, ok] of cases) {
    const requests = [];
    const { app } = createRecipeApp(recordingFetch(requests));
    app.newRecipe = { ...app.newRecipe, ...titles };
    await app.addRecipe();
    assert.equal(requests.length, ok ? 1 : 0, JSON.stringify(titles));
    assert.equal(app.formError, ok ? '' : 'Vyplňte názov receptu (po slovensky alebo po česky).');
    assert.equal(app.saving, false);
  }
  const { app } = createRecipeApp();
  app.language = 'cs';
  assert.equal(app.t('titleRequired'), 'Vyplňte název receptu (slovensky nebo česky).');
});

test('the form does not require the Czech title specifically', () => {
  assert.doesNotMatch(html, /newRecipe\.title_cs" :required="isLanguageEnabled\('cs'\)"/);
  assert.match(html, /newRecipe\.title_cs" :required="isLanguageEnabled\('cs'\) && !newRecipe\.title_sk"/);
  assert.match(html, /newRecipe\.title_sk" :required="!newRecipe\.title_cs"/);
});

test('errors map to translated reasons by kind and HTTP status', () => {
  const { context } = createRecipeApp();
  const { apiError, errorReasonKey } = context;
  assert.equal(errorReasonKey(apiError('config', 'x')), 'databaseUnavailable');
  assert.equal(errorReasonKey(apiError('network', 'x')), 'connectionError');
  assert.equal(errorReasonKey(apiError('noRows', 'x')), 'notSavedError');
  for (const status of [401, 403]) assert.equal(errorReasonKey(apiError('http', 'x', status)), 'permissionError');
  for (const status of [400, 409, 422]) assert.equal(errorReasonKey(apiError('http', 'x', status)), 'invalidDataError');
  for (const status of [404, 408, 429, 500, 503]) assert.equal(errorReasonKey(apiError('http', 'x', status)), 'serverError');
  assert.equal(errorReasonKey(new Error('boom')), 'unexpectedError');
  assert.equal(errorReasonKey(undefined), 'unexpectedError');
});

test('every error reason is translated in Slovak and Czech without technical words', () => {
  const { app } = createRecipeApp();
  const keys = ['databaseUnavailable', 'connectionError', 'notSavedError', 'permissionError',
    'invalidDataError', 'serverError', 'unexpectedError', 'saveError', 'favoriteError'];
  for (const language of ['sk', 'cs']) {
    app.language = language;
    for (const key of keys) {
      assert.notEqual(app.t(key), key, `${language}.${key}`);
      if (key !== 'databaseUnavailable') assert.doesNotMatch(app.t(key), /Supabase|HTTP|PGRST|RLS/, `${language}.${key}`);
    }
  }
});

test('a failed save shows a friendly message and logs the technical details', async () => {
  const { app, logged } = createRecipeApp(httpError(409));
  app.newRecipe = { ...app.newRecipe, title_sk: 'Test' };
  await app.addRecipe();
  assert.equal(app.formError, 'Recept sa nepodarilo uložiť. Niektoré údaje sa nepodarilo uložiť. Skontrolujte vyplnené hodnoty.');
  assert.doesNotMatch(app.formError, /secret detail|409|Supabase/);
  assert.equal(logged.length, 1);
  assert.match(String(logged[0][1].message), /Supabase HTTP 409: .*secret detail/);
  assert.equal(app.saving, false);
});

test('a network failure while loading shows a friendly message only', async () => {
  const { app, logged } = createRecipeApp(async () => { throw new TypeError('Failed to fetch'); });
  await app.fetchRecipes();
  assert.equal(app.errorMessage, 'Skontrolujte pripojenie k internetu a skúste to znova.');
  assert.match(String(logged[0][1].message), /Failed to fetch/);
  app.language = 'cs';
  await app.fetchRecipes();
  assert.equal(app.errorMessage, 'Zkontrolujte připojení k internetu a zkuste to znovu.');
});

test('missing configuration shows the configuration message', async () => {
  const { app, context } = createRecipeApp();
  context.window.SUPABASE_CONFIG = undefined;
  await app.fetchRecipes();
  assert.equal(app.errorMessage, app.t('databaseUnavailable'));
});

test('the detail nutrition table (per 100 g) has no SJ, GI or GL columns', () => {
  const table = html.slice(html.indexOf('id="detail-nutrition-heading"'), html.indexOf('</table>'));
  assert.match(table, /<table/);
  for (const forbidden of [/t\('sj'\)/, /t\('gi'\)/, /t\('glycemicLoad'\)/, /\.sj\b/, /\.gi\b/, /glycemic_load/]) {
    assert.doesNotMatch(table, forbidden);
  }
  assert.equal((table.match(/<th\b/g) || []).length, 6);
});

test('SJ, GI and GL are shown in their own labelled block, GI coloured by category', () => {
  const start = html.indexOf('aria-labelledby="detail-glycemic-heading"');
  assert.ok(start > html.indexOf('</table>'), 'block comes after the table');
  const block = html.slice(start, html.indexOf('</section>', start));
  assert.match(block, /x-text="t\('glycemicValues'\)"/);
  assert.match(block, /displayValue\(selectedRecipe\.sj\)/);
  assert.match(block, /displayGi\(selectedRecipe\.gi\)/);
  assert.match(block, /:class="giClass\(selectedRecipe && selectedRecipe\.gi\)"/);
  assert.match(block, /giLabel\(selectedRecipe\.gi\)/);
  assert.match(block, /displayValue\(selectedRecipe\.glycemic_load\)/);
  // Only SJ is a per-100 g value in this block.
  assert.equal((block.match(/t\('per100g'\)/g) || []).length, 1);
});

test('recipe cards show the GI badge from displayGi and giClass', () => {
  const start = html.indexOf('<template x-for="recipe in filteredRecipes"');
  const cards = html.slice(start, html.indexOf('</template>', start));
  assert.match(cards, /:class="giClass\(recipe\.gi\)"/);
  assert.match(cards, /x-text="displayGi\(recipe\.gi\)"/);
});

test('a reviewed migration converts the GI column to numeric', () => {
  const dir = 'supabase/migrations';
  const file = fs.readdirSync(dir).find((name) => /^\d{14}_recipes_gi_numeric\.sql$/.test(name));
  assert.ok(file, 'migration file missing');
  const sql = fs.readFileSync(`${dir}/${file}`, 'utf8');
  assert.match(sql, /NEEDS REVIEW BEFORE APPLYING/);
  assert.match(sql, /alter column gi type numeric/i);
  assert.match(sql, /check \(gi is null or \(gi >= 0 and gi <= 100\)\)/i);
});
