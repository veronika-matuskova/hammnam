// The educational page (ucenie.html) and its calculators (js/learn.js).
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { readRepoFile } = require('./helpers/app-harness');

function loadLearn(storage = {}) {
  const context = {
    Intl,
    window: { localStorage: { getItem: (key) => (key in storage ? storage[key] : null) } }
  };
  vm.createContext(context);
  vm.runInContext(`${readRepoFile('js/learn.js')}\nthis.api = { kcalFromMacros, kcalToKj, amountForGrams, sjFromCarbs, glycemicLoad, learnGiCategory, glCategory, formatLearnNumber, learnPage };`, context);
  return context.api;
}

const page = readRepoFile('ucenie.html');

test('kcal from macros uses 4 / 4 / 9 (+ 2 for fiber)', () => {
  const { kcalFromMacros, kcalToKj } = loadLearn();
  assert.equal(kcalFromMacros({ proteins: '3', carbs: '20', fats: '5' }), 137);
  assert.equal(kcalFromMacros({ proteins: '3', carbs: '20', fats: '5', fiber: '2,5' }), 142);
  assert.equal(kcalFromMacros({ carbs: '10' }), 40);
  assert.equal(kcalFromMacros({}), null);
  assert.equal(kcalFromMacros({ proteins: 'abc' }), null);
  assert.equal(Math.round(kcalToKj(100)), 418);
});

test('values per 100 g are scaled to the portion', () => {
  const { amountForGrams } = loadLearn();
  assert.equal(amountForGrams('137', '250'), 342.5);
  assert.equal(amountForGrams('12', '150'), 18);
  assert.equal(amountForGrams('', '150'), null);
  assert.equal(amountForGrams('12', '-1'), null);
});

test('SJ = carbohydrates / 10 (or 12)', () => {
  const { sjFromCarbs } = loadLearn();
  assert.equal(sjFromCarbs(18), 1.8);
  assert.equal(sjFromCarbs('60', 10), 6);
  assert.equal(sjFromCarbs('60', 12), 5);
  assert.equal(sjFromCarbs('60', 7), 6, 'unknown factor falls back to 10');
  assert.equal(sjFromCarbs(null), null);
});

test('GL = GI × carbs / 100 with low / medium / high bands', () => {
  const { glycemicLoad, glCategory, learnGiCategory } = loadLearn();
  assert.equal(Math.round(glycemicLoad('72', '11')), 8);
  assert.equal(Math.round(glycemicLoad('73', '42')), 31);
  assert.equal(glycemicLoad('120', '10'), null, 'GI above 100 is invalid');
  assert.equal(glCategory(10), 'low');
  assert.equal(glCategory(10.4), 'low');
  assert.equal(glCategory(11), 'medium');
  assert.equal(glCategory(19), 'medium');
  assert.equal(glCategory(20), 'high');
  assert.equal(learnGiCategory(55), 'low');
  assert.equal(learnGiCategory(56), 'medium');
  assert.equal(learnGiCategory(69), 'medium');
  assert.equal(learnGiCategory(70), 'high');
});

test('the SJ calculator starts with the factor the user picked in the app', () => {
  assert.equal(loadLearn({ 'hamMnam-sjFactor': '12' }).learnPage().sj.factor, 12);
  assert.equal(loadLearn({}).learnPage().sj.factor, 10);
  assert.equal(loadLearn({ 'hamMnam-sjFactor': '9' }).learnPage().sj.factor, 10);
});

test('default calculator results match the worked examples on the page', () => {
  const state = loadLearn().learnPage();
  assert.equal(state.kcalResult, 137);
  assert.equal(state.portionResult, 342.5);
  assert.equal(state.sjResult, 1.8);
  assert.equal(state.glLevel, 'low');
});

test('links from the app point to sections that exist on the page', () => {
  const html = readRepoFile('index.html');
  const links = [...html.matchAll(/href="\.\/ucenie\.html(?:#([a-z0-9-]+))?"/g)];
  assert.ok(links.length >= 3, 'index.html should link to ucenie.html');
  for (const [, anchor] of links) {
    if (anchor) assert.match(page, new RegExp(`id="${anchor}"`), `#${anchor} missing in ucenie.html`);
  }
  for (const [, anchor] of page.matchAll(/href="#([a-z0-9-]+)"/g)) {
    assert.match(page, new RegExp(`id="${anchor}"`), `table of contents link #${anchor} has no section`);
  }
});

test('the page is deployed and cached for offline use', () => {
  const ci = readRepoFile('.github/workflows/ci.yml');
  const serviceWorker = readRepoFile('sw.js');
  assert.match(ci, /cp [^\n]*\bucenie\.html\b[^\n]*_site\//, 'ci.yml must copy ucenie.html into _site');
  assert.match(serviceWorker, /'\.\/ucenie\.html'/, 'APP_SHELL should precache ucenie.html');
  assert.match(serviceWorker, /'\.\/js\/learn\.js'/, 'APP_SHELL should precache js/learn.js');
  assert.match(page, /src="\.\/js\/learn\.js"/);
});

test('the page is in Slovak (no Czech-only letters)', () => {
  assert.doesNotMatch(page.replace(/<script[\s\S]*?<\/script>/g, ''), /[ěůřĚŮŘ]/);
  assert.doesNotMatch(readRepoFile('js/learn.js'), /[ěůřĚŮŘ]/);
});
