const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { appSource, loadApp, objectLiteralSource, readRepoFile } = require('./helpers/app-harness');

const source = appSource();
const translationsText = objectLiteralSource(source, 'translations');

// Keys of one locale block exactly as written in the source. A JS object literal
// silently keeps only the last of two duplicate keys, so duplicates are only
// visible in the source text, not in the evaluated object.
function localeKeysInSource(text, locale) {
  const match = text.match(new RegExp(`\\n(\\s*)${locale}: \\{\\n([\\s\\S]*?)\\n\\1\\}`));
  assert.ok(match, `locale ${locale} not found`);
  const keyIndent = match[2].match(/^(\s*)/)[1];
  return [...match[2].matchAll(new RegExp(`^${keyIndent}([A-Za-z0-9_]+|'[^']+'):`, 'gm'))]
    .map((m) => m[1].replace(/^'|'$/g, ''));
}

const duplicatesOf = (keys) => [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];

const translations = vm.runInNewContext(`(${translationsText})`);

function createRecipeApp() {
  return loadApp();
}

test('sk and cs translations have the same keys', () => {
  const sk = Object.keys(translations.sk).sort();
  const cs = Object.keys(translations.cs).sort();
  assert.deepEqual(sk, cs);
});

test('no locale defines a key twice', () => {
  for (const locale of ['cs', 'sk']) {
    const keys = localeKeysInSource(translationsText, locale);
    assert.equal(keys.length >= Object.keys(translations[locale]).length, true, `${locale}: key scan missed keys`);
    assert.deepEqual(duplicatesOf(keys), [], `${locale} has duplicate keys`);
  }
});

test('the duplicate-key scan catches a duplicated key', () => {
  // Guards the scanner itself: backToRecipes used to be defined twice in both locales (#33).
  const sample = "{\n  cs: {\n    a: 'x',\n    backToRecipes: 'Zpět',\n    backToRecipes: 'Zpět na recepty'\n  },\n  sk: {\n    a: 'y'\n  }\n}";
  assert.deepEqual(duplicatesOf(localeKeysInSource(sample, 'cs')), ['backToRecipes']);
  assert.deepEqual(duplicatesOf(localeKeysInSource(sample, 'sk')), []);
});

test('every translation key used by index.html and js/app.js exists in sk and cs', () => {
  // t() falls back to the key itself, so a missing key would show up as raw text in the UI.
  const used = new Set();
  for (const text of [readRepoFile('index.html'), source]) {
    for (const call of text.matchAll(/\bt\(([^()]*)\)/g)) {
      for (const literal of call[1].matchAll(/'([A-Za-z0-9_]+)'/g)) used.add(literal[1]);
    }
  }
  // Keys built at runtime: numeric field labels in addRecipe() and recipe count plurals.
  for (const field of ['servings', 'sj', 'carbs', 'fiber', 'calories', 'proteins', 'fats', 'salt', 'glycemicLoad', 'totalWeight']) used.add(field);
  for (const key of ['recipeCount', 'recipeCountOne', 'recipeCountFew']) used.add(key);
  assert.ok(used.size > 40, `only found ${used.size} keys; the scan is probably broken`);
  for (const locale of ['sk', 'cs']) {
    const missing = [...used].filter((key) => !(key in translations[locale]));
    assert.deepEqual(missing, [], `${locale} is missing keys`);
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
  assert.equal(app.t('nutritionPer100g'), 'Nutričné hodnoty na 100 g');
  assert.equal(app.t('totalRecipeValues'), 'Celý recept');
  assert.equal(app.t('totalWeight'), 'Celková hmotnosť hotového jedla');
  assert.equal(app.t('close'), 'Zavrieť');
});
