const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp } = require('./helpers/app-harness');

const RECIPES = [
  {
    id: 1,
    title_sk: 'Ovsené raňajky',
    category_sk: 'Raňajky',
    favorite: true,
    ingredients: [{ name: 'Ovsené vločky', amount: '50', unit: 'g' }, { name: 'Mlieko', amount: '200', unit: 'ml' }]
  },
  {
    id: 2,
    title_sk: 'Kuracie s ryžou',
    category_sk: 'Obed',
    favorite: false,
    ingredients: [{ name: 'Kuracie prsia', amount: '300', unit: 'g' }, { name: 'Ryža', amount: '150', unit: 'g' }]
  },
  {
    id: 3,
    title_sk: 'Cesnaková polievka',
    category_sk: 'Polievky',
    favorite: true,
    ingredients: [{ name: 'Česnak', amount: '6', unit: 'strúčikov' }, { name: 'Zemiaky', amount: '2', unit: 'ks' }]
  },
  {
    id: 4,
    title_cs: 'Kuřecí vývar',
    title_sk: 'Kurací vývar',
    category_cs: 'Polévky',
    category_sk: 'Polievky',
    favorite: false,
    ingredients: [{ name: 'Mrkev', amount: '2', unit: 'ks' }]
  }
];

function appWithRecipes(search = '', recipes = RECIPES) {
  const app = loadApp();
  app.recipes = structuredClone(recipes);
  app.search = search;
  return app;
}

const ids = (app) => app.filteredRecipes.map((recipe) => recipe.id);

test('a query without diacritics matches a title with them', () => {
  assert.deepEqual(ids(appWithRecipes('ovsene ranajky')), [1]);
  assert.deepEqual(ids(appWithRecipes('vyvar')), [4]);
});

test('a query with diacritics still matches', () => {
  assert.deepEqual(ids(appWithRecipes('raňajky')), [1]);
  assert.deepEqual(ids(appWithRecipes('cesnaková')), [3]);
});

test('diacritics in the query match plain text in the recipe', () => {
  // "Cesnaková" in the title has a plain "c"; "česnak" in the query still finds it.
  assert.deepEqual(ids(appWithRecipes('česnaková polievka')), [3]);
});

test('case is ignored', () => {
  assert.deepEqual(ids(appWithRecipes('RAŇAJKY')), [1]);
  assert.deepEqual(ids(appWithRecipes('RYZA')), [2]);
});

test('extra whitespace in the query is ignored', () => {
  assert.deepEqual(ids(appWithRecipes('  kuracie   ryza  ')), [2]);
});

test('the category is searched', () => {
  assert.deepEqual(ids(appWithRecipes('obed')), [2]);
  assert.deepEqual(ids(appWithRecipes('polievky')), [3, 4]);
});

test('ingredient names are searched without diacritics', () => {
  assert.deepEqual(ids(appWithRecipes('cesnak')), [3]);
  assert.deepEqual(ids(appWithRecipes('mlieko')), [1]);
  assert.deepEqual(ids(appWithRecipes('zemiaky')), [3]);
});

test('every word must match, each in any field', () => {
  // "kuracie" is in the title, "prsia" only in an ingredient.
  assert.deepEqual(ids(appWithRecipes('kuracie prsia')), [2]);
  // "polievky" is the category, "zemiaky" an ingredient.
  assert.deepEqual(ids(appWithRecipes('polievky zemiaky')), [3]);
  assert.deepEqual(ids(appWithRecipes('kuracie cesnak')), []);
});

test('a query that matches nothing returns no recipes', () => {
  assert.deepEqual(ids(appWithRecipes('pizza')), []);
});

test('an empty or blank query returns all recipes', () => {
  assert.deepEqual(ids(appWithRecipes('')), [1, 2, 3, 4]);
  assert.deepEqual(ids(appWithRecipes('   ')), [1, 2, 3, 4]);
});

test('only the displayed language variant of the title is searched', () => {
  // The UI is Slovak, so the Czech title "Kuřecí vývar" is not shown or searched.
  assert.deepEqual(ids(appWithRecipes('kureci vyvar')), []);
  assert.deepEqual(ids(appWithRecipes('kuraci vyvar')), [4]);
});

test('search combines with the selected category', () => {
  const app = appWithRecipes('polievka');
  app.selectedCategory = 'Polievky';
  assert.deepEqual(ids(app), [3]);
  app.search = '';
  assert.deepEqual(ids(app), [3, 4]);
  app.search = 'ryza';
  assert.deepEqual(ids(app), []);
});

test('the selected category still needs an exact displayed match', () => {
  const app = appWithRecipes('');
  app.selectedCategory = 'polievky';
  assert.deepEqual(ids(app), []);
});

test('search combines with favorites only', () => {
  const app = appWithRecipes('cesnak');
  app.favoritesOnly = true;
  assert.deepEqual(ids(app), [3]);
  app.search = 'ryza';
  assert.deepEqual(ids(app), []);
  app.search = '';
  assert.deepEqual(ids(app), [1, 3]);
});

test('recipes with missing or malformed ingredients do not throw', () => {
  const recipes = [
    { id: 10, title_sk: 'Bez surovín' },
    { id: 11, title_sk: 'Null suroviny', ingredients: null },
    { id: 12, title_sk: 'Text namiesto zoznamu', ingredients: 'ryža' },
    { id: 13, title_sk: 'Zmiešané', ingredients: [null, 'ryža', 42, {}, { name: null }, { amount: '1' }, { name: 'Ryža' }] },
    { id: 14, ingredients: [{ name: 7 }] }
  ];
  assert.deepEqual(ids(appWithRecipes('ryza', recipes)), [13]);
  assert.deepEqual(ids(appWithRecipes('bez surovin', recipes)), [10]);
  assert.deepEqual(ids(appWithRecipes('7', recipes)), [14]);
  assert.deepEqual(ids(appWithRecipes('', recipes)), [10, 11, 12, 13, 14]);
});

test('Slovak and Czech letters are folded to plain letters', () => {
  const app = appWithRecipes('', [
    { id: 20, title_sk: 'äľĺŕôňťďščžýáíéúůěřó' },
    { id: 21, title_sk: 'ÄĽĹŔÔŇŤĎŠČŽÝÁÍÉÚŮĚŘÓ' },
    { id: 22, title_sk: 'allrontdsczyaieuuero' }
  ]);
  app.search = 'allrontdsczyaieuuero';
  assert.deepEqual(ids(app), [20, 21, 22]);
  app.search = 'ÄĽĹŔÔŇŤĎŠČŽÝÁÍÉÚŮĚŘÓ';
  assert.deepEqual(ids(app), [20, 21, 22]);
});
