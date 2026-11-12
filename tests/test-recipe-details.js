const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, readRepoFile } = require('./helpers/app-harness');

// Thin wrapper kept so the tests below read as before; the harness (with a real
// history stack) lives in tests/helpers/app-harness.js.
function createRecipeApp(fetch, initialHash = '') {
  return loadApp({ fetch, hash: initialHash });
}

test('new recipes initialize with empty detail fields', () => {
  const app = createRecipeApp();

  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.ingredients)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.steps)), []);
  assert.equal(app.newRecipe.notes, '');
  assert.equal(app.newRecipe.servings, null);
  assert.equal(app.newRecipe.fiber, null);
  assert.equal(app.newRecipe.glycemic_load, null);
});

test('saving a recipe posts all nutritional metrics', async () => {
  let requestBody;
  const app = createRecipeApp(async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 201,
      json: async () => [{ id: 1, ...requestBody }]
    };
  });
  app.newRecipe = {
    ...app.newRecipe,
    servings: '4',
    sj: '2.5',
    carbs: '30',
    fiber: '8',
    calories: '420',
    proteins: '22',
    fats: '12',
    salt: '1.2',
    glycemic_load: '15',
    gi: '55',
    title_sk: 'Polievka',
    ingredients: [{ name: ' Mrkev ', amount: ' 2 ', unit: ' ks ' }],
    steps: ['Nakrájet.'],
    notes: ' Dobré. '
  };

  await app.addRecipe();

  assert.equal(requestBody.servings, 4);
  assert.equal(requestBody.sj, 2.5);
  assert.equal(requestBody.carbs, 30);
  assert.equal(requestBody.fiber, 8);
  assert.equal(requestBody.calories, 420);
  assert.equal(requestBody.proteins, 22);
  assert.equal(requestBody.fats, 12);
  assert.equal(requestBody.salt, 1.2);
  assert.equal(requestBody.glycemic_load, 15);
  assert.equal(requestBody.gi, 55);
  assert.equal(requestBody.notes, 'Dobré.');
});

test('recipe details open, follow the selected language, and close', () => {
  const app = createRecipeApp();
  const recipe = {
    id: 1,
    title_cs: 'Polévka',
    title_sk: 'Polievka',
    ingredients: [{ name: 'Mrkev', amount: '2', unit: 'ks' }, null],
    steps: ['Nakrájet zeleninu.', '  ']
  };
  app.showForm = true;

  app.openRecipe(recipe);

  assert.equal(app.showForm, false);
  assert.equal(app.selectedRecipe, recipe);
  assert.equal(app.selectedRecipe.id, 1);
  assert.equal(app.displayTitle(app.selectedRecipe), 'Polievka');
  // Czech is disabled in the UI but kept for the future; it still resolves when selected.
  app.language = 'cs';
  assert.equal(app.displayTitle(app.selectedRecipe), 'Polévka');
  assert.deepEqual(JSON.parse(JSON.stringify(app.recipeIngredients(recipe))), [
    { name: 'Mrkev', amount: '2', unit: 'ks' }
  ]);
  assert.equal(app.ingredientMeasure(recipe.ingredients[0]), '2 ks');
  assert.deepEqual(JSON.parse(JSON.stringify(app.recipeSteps(recipe))), ['Nakrájet zeleninu.']);

  app.closeRecipe();
  assert.equal(app.selectedRecipe, null);
});

test('recipe detail routes work when opening a direct link', () => {
  const app = createRecipeApp(undefined, '#recipe/42');
  const recipe = { id: 42, title_cs: 'Koláč' };
  app.recipes = [recipe];

  app.syncRoute();

  assert.equal(app.selectedRecipe, recipe);
});

test('new recipe page opens, closes, and supports direct links', () => {
  const app = createRecipeApp();

  app.openForm();
  assert.equal(app.showForm, true);
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.location.hash, '#new-recipe');

  app.closeForm();
  assert.equal(app.showForm, false);
  assert.equal(app.location.hash, '');

  const directLinkApp = createRecipeApp(undefined, '#new-recipe');
  directLinkApp.syncRoute();
  assert.equal(directLinkApp.showForm, true);
  directLinkApp.closeForm();
  assert.equal(directLinkApp.showForm, false);
  assert.equal(directLinkApp.location.hash, '');
});

test('editing a recipe loads its values and patches the existing row', async () => {
  let requestUrl;
  let requestOptions;
  const recipe = {
    id: 42,
    title_cs: 'Koláč',
    category_cs: 'Dezert',
    servings: 4,
    ingredients: [{ name: 'Jablka', amount: '3', unit: 'ks' }],
    steps: ['Upéct.'],
    notes: 'Podávat teplé.',
    favorite: true,
    created_at: '2026-01-01'
  };
  const app = createRecipeApp(async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => [{ ...recipe, ...JSON.parse(options.body), title_cs: 'Upravený koláč' }]
    };
  });
  app.recipes = [recipe];

  app.editRecipe(recipe);

  assert.equal(app.showForm, true);
  assert.equal(app.selectedRecipe, null);
  assert.equal(app.editingRecipeId, 42);
  assert.equal(app.newRecipe.title_cs, 'Koláč');
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.ingredients)), [
    { name: 'Jablka', amount: '3', unit: 'ks' }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.steps)), ['Upéct.']);
  assert.equal(app.newRecipe.notes, 'Podávat teplé.');

  app.newRecipe.title_cs = 'Upravený koláč';
  await app.addRecipe();

  assert.match(requestUrl, /\/rest\/v1\/recipes\?id=eq\.42$/);
  assert.equal(requestOptions.method, 'PATCH');
  const payload = JSON.parse(requestOptions.body);
  assert.equal(payload.title_cs, 'Upravený koláč');
  assert.equal('id' in payload, false);
  assert.equal('favorite' in payload, false);
  assert.equal('created_at' in payload, false);
  assert.equal(app.recipes.length, 1);
  assert.equal(app.recipes[0].title_cs, 'Upravený koláč');
  assert.equal(app.selectedRecipe, app.recipes[0]);
  assert.equal(app.showForm, false);
  // Saving goes back to the entry the edit was opened from (the list here).
  assert.equal(app.location.hash, '');
  assert.equal(app.history.index, 0);
});

test('language fallbacks keep nutrition labels translated when switching routes', () => {
  const app = createRecipeApp();
  app.language = 'sk';

  assert.equal(app.t('nutritionTable'), 'Nutričná tabuľka');
  assert.equal(app.t('totalWeight'), 'Celková hmotnosť hotového jedla');

  app.showForm = true;
  const recipe = { id: 1, title_cs: 'Polévka', title_sk: 'Polievka', servings: 2 };
  app.openRecipe(recipe);
  assert.equal(app.t('nutritionTable'), 'Nutričná tabuľka');

  app.closeRecipe();
  assert.equal(app.t('nutritionTable'), 'Nutričná tabuľka');
});

test('whole-recipe section keeps only servings and total weight', () => {
  const app = createRecipeApp();
  for (const language of ['sk', 'cs']) {
    app.language = language;
    for (const key of ['totalCalories', 'totalProteins', 'totalFats', 'totalCarbs']) {
      assert.equal(app.t(key), key, `${language}.${key} should be removed`);
    }
  }
  for (const field of ['total_calories', 'total_proteins', 'total_fats', 'total_carbs']) {
    assert.equal(field in app.newRecipe, false, `${field} should not be in the form model`);
  }
  app.language = 'sk';
  assert.equal(app.t('totalRecipeValues'), 'Celý recept');
  assert.equal(app.t('totalRecipeNote'), 'Počet porcií a hmotnosť celého hotového jedla.');
});

test('GI badges are coloured from the number (low/medium/high), not from text', () => {
  const app = createRecipeApp();

  assert.equal(app.giClass('55'), 'bg-emerald-50 text-emerald-800');
  assert.equal(app.giClass(56), 'bg-amber-50 text-amber-800');
  assert.equal(app.giClass('70'), 'bg-red-50 text-red-800');
  // Legacy free-text values get a neutral colour.
  assert.equal(app.giClass('nízký'), 'bg-slate-100 text-slate-700');
  assert.equal(app.giClass('vysoký'), 'bg-slate-100 text-slate-700');
});

test('new recipe form renders as a dedicated page rather than a modal', () => {
  const html = readRepoFile('index.html');
  const formPage = html.slice(html.indexOf('<main x-show="showForm"'), html.indexOf('<footer'));

  assert.match(formPage, /aria-labelledby="form-title"/);
  assert.match(formPage, /@click="closeForm\(\)"/);
  assert.match(formPage, /@submit\.prevent="addRecipe\(\)"/);
  assert.doesNotMatch(formPage, /role="dialog"|aria-modal="true"|fixed inset-0/);
});

test('recipe details render as a dedicated page rather than a modal', () => {
  const html = readRepoFile('index.html');

  assert.match(html, /<main x-show="selectedRecipe" x-cloak/);
  assert.match(html, /<button\s+type="button"\s+@click="closeRecipe\(\)"/);
  assert.match(html, /@click="editRecipe\(selectedRecipe\)"/);
  assert.doesNotMatch(html, /aria-modal="true"[^]*recipe-detail-title/);
});

test('recipe cards use nutrition tags and keep the full table on the detail page', () => {
  const html = readRepoFile('index.html');
  const recipeCards = html.slice(html.indexOf('<template x-for="recipe in filteredRecipes"'), html.indexOf('id="detail-nutrition-heading"'));

  assert.match(recipeCards, /displayMetric\(recipe\.calories, 'kcal'\)/);
  assert.equal((recipeCards.match(/t\('per100gSuffix'\)/g) || []).length, 3);
  assert.doesNotMatch(recipeCards, /<table/);
  assert.equal((html.match(/overflow-x-auto rounded-xl border border-slate-200/g) || []).length, 1);
  assert.match(html, /min-w-\[34rem\] border-collapse/);
});

test('recipe nutrition details avoid duplicate highlights and hide empty totals', () => {
  const html = readRepoFile('index.html');
  const nutritionSection = html.slice(html.indexOf('id="detail-nutrition-heading"'), html.indexOf('id="detail-ingredients-heading"'));
  const totalNutritionSection = html.slice(html.indexOf('selectedRecipe.servings != null || selectedRecipe.total_weight != null'), html.indexOf('id="detail-nutrition-heading"'));

  assert.doesNotMatch(html, /grid grid-cols-3 gap-2 sm:gap-3/);
  assert.match(nutritionSection, /x-text="t\('gi'\)"/);
  assert.match(nutritionSection, /id="detail-glycemic-heading"/);
  assert.match(nutritionSection, /t\('per100g'\)/);
  assert.match(totalNutritionSection, /x-text="t\('totalRecipeValues'\)"/);
  assert.match(totalNutritionSection, /selectedRecipe && selectedRecipe\.servings != null/);
  assert.match(totalNutritionSection, /selectedRecipe && selectedRecipe\.total_weight != null/);
  assert.doesNotMatch(html, /total_(calories|proteins|fats|carbs)/);
});

test('saving a recipe posts normalized ingredients, steps, and notes', async () => {
  let requestUrl;
  let requestOptions;
  const app = createRecipeApp(async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      status: 201,
      json: async () => [{ id: 1, ...JSON.parse(options.body) }]
    };
  });
  app.newRecipe.title_cs = 'Polévka';
  app.newRecipe.category_cs = 'Oběd';
  app.newRecipe.ingredients = [
    { name: ' Mrkev ', amount: ' 2 ', unit: ' ks ' },
    { name: ' ', amount: '', unit: '' }
  ];
  app.newRecipe.steps = [' Nakrájet zeleninu. ', '  '];
  app.newRecipe.notes = ' Podávat teplé. ';

  await app.addRecipe();

  assert.equal(requestUrl, 'https://example.supabase.co/rest/v1/recipes');
  assert.equal(requestOptions.method, 'POST');
  assert.deepEqual(JSON.parse(requestOptions.body).ingredients, [
    { name: 'Mrkev', amount: '2', unit: 'ks' }
  ]);
  assert.deepEqual(JSON.parse(requestOptions.body).steps, ['Nakrájet zeleninu.']);
  assert.equal(JSON.parse(requestOptions.body).notes, 'Podávat teplé.');
  assert.equal(app.recipes.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.ingredients)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(app.newRecipe.steps)), []);
  assert.equal(app.newRecipe.notes, '');
});

test('the app is Slovak-only and ignores a saved Czech preference', () => {
  const app = createRecipeApp();
  assert.equal(app.language, 'sk');
  assert.equal(app.canSwitchLanguage, false);
  assert.equal(app.isLanguageEnabled('cs'), false);
  assert.equal(app.t('newRecipe'), '+ Nový recept');
  assert.equal(app.t('heading'), 'Recepty na jednom mieste');

  app.toggleLanguage();
  assert.equal(app.language, 'sk');
});

test('a saved Czech language preference falls back to Slovak', () => {
  assert.equal(loadApp({ savedLanguage: 'cs' }).language, 'sk');
});

test('Czech translations are kept for a future language switch', () => {
  const app = createRecipeApp();
  app.language = 'cs';
  assert.equal(app.t('heading'), 'Recepty na jednom místě');
});

test('the language switch is hidden and Slovak names are required in the form', () => {
  const html = readRepoFile('index.html');
  assert.match(html, /<html lang="sk">/);
  assert.match(html, /x-show="canSwitchLanguage"\s+type="button"\s+@click="toggleLanguage\(\)"/);
  // At least one title/category is needed, Slovak or Czech.
  assert.match(html, /x-model\.trim="newRecipe\.title_sk" :required="!newRecipe\.title_cs"/);
  assert.match(html, /x-model\.trim="newRecipe\.title_cs" :required="isLanguageEnabled\('cs'\) && !newRecipe\.title_sk"/);
  assert.match(html, /x-model\.trim="newRecipe\.category_sk" :required="!newRecipe\.category_cs"/);
  assert.doesNotMatch(html, /x-model\.trim="newRecipe\.title_cs" required/);
});

test('editing an older Czech-only recipe prefills the Slovak fields', () => {
  const app = createRecipeApp();
  app.loadRecipeForEditing({ id: 7, title_cs: 'Koláč', category_cs: 'Dezert', notes: '' });
  assert.equal(app.newRecipe.title_sk, 'Koláč');
  assert.equal(app.newRecipe.category_sk, 'Dezert');
  assert.equal(app.newRecipe.title_cs, 'Koláč');
});
