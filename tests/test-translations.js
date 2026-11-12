const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('js/app.js', 'utf8');

// Source text of the `translations` object literal, from `{` to its matching `}`.
function translationsSource() {
  const start = source.indexOf('{', source.indexOf('const translations'));
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('translations object not found');
}

// Source text of one locale block inside the translations literal.
function localeSource(locale) {
  const text = translationsSource();
  const match = text.match(new RegExp(`\\n  ${locale}: \\{\\n([\\s\\S]*?)\\n  \\}`));
  assert.ok(match, `locale ${locale} not found`);
  return match[1];
}

function localeKeysInSource(locale) {
  return [...localeSource(locale).matchAll(/^ {4}([A-Za-z0-9_]+):/gm)].map((m) => m[1]);
}

const translations = vm.runInNewContext(`(${translationsSource()})`);

function createRecipeApp() {
  let factory;
  const context = {
    Alpine: { data(name, registeredFactory) { factory = registeredFactory; } },
    document: { addEventListener(event, callback) { if (event === 'alpine:init') callback(); } },
    localStorage: { getItem: () => null, setItem: () => {} },
    window: { location: { hash: '', pathname: '/', search: '' }, history: {}, addEventListener() {} },
    Intl,
    console
  };
  vm.runInNewContext(source, context);
  return factory();
}

test('sk and cs translations have the same keys', () => {
  const sk = Object.keys(translations.sk).sort();
  const cs = Object.keys(translations.cs).sort();
  assert.deepEqual(sk, cs);
});

test('no locale defines a key twice', () => {
  for (const locale of ['cs', 'sk']) {
    const keys = localeKeysInSource(locale);
    assert.equal(keys.length, Object.keys(translations[locale]).length, `${locale}: key scan mismatch`);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    assert.deepEqual(duplicates, [], `${locale} has duplicate keys`);
  }
});

test('no translation value is empty', () => {
  for (const locale of ['cs', 'sk']) {
    for (const [key, value] of Object.entries(translations[locale])) {
      assert.ok(typeof value === 'string' && value.trim(), `${locale}.${key} is empty`);
    }
  }
});

test('Slovak strings contain no Czech-only letters', () => {
  for (const [key, value] of Object.entries(translations.sk)) {
    assert.doesNotMatch(value, /[ěůřĚŮŘ]/, `sk.${key} looks Czech: ${value}`);
  }
});

test('recipe count uses Slovak plural forms', () => {
  const app = createRecipeApp();
  app.language = 'sk';
  assert.equal(app.recipeCountLabel(0), '0 receptov');
  assert.equal(app.recipeCountLabel(1), '1 recept');
  assert.equal(app.recipeCountLabel(2), '2 recepty');
  assert.equal(app.recipeCountLabel(4), '4 recepty');
  assert.equal(app.recipeCountLabel(5), '5 receptov');
  assert.equal(app.recipeCountLabel(21), '21 receptov');
});

test('recipe count uses Czech plural forms', () => {
  const app = createRecipeApp();
  app.language = 'cs';
  assert.equal(app.recipeCountLabel(0), '0 receptů');
  assert.equal(app.recipeCountLabel(1), '1 recept');
  assert.equal(app.recipeCountLabel(3), '3 recepty');
  assert.equal(app.recipeCountLabel(5), '5 receptů');
});

test('form eyebrow has a separate text for editing', () => {
  const app = createRecipeApp();
  app.language = 'sk';
  assert.equal(app.t('formEyebrow'), 'Nový prírastok do kuchárky');
  assert.equal(app.t('editFormEyebrow'), 'Úprava receptu v kuchárke');
});

test('corrected Slovak copy', () => {
  const app = createRecipeApp();
  app.language = 'sk';
  assert.equal(app.t('calories'), 'Kalórie (kcal)');
  assert.equal(app.t('extraValues'), 'Doplnkové hodnoty');
  assert.equal(app.t('totalWeight'), 'Celková hmotnosť hotového jedla');
  assert.equal(app.t('close'), 'close', 'unused close key was removed');
});
