const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, jsonResponse, deferred } = require('./helpers/app-harness');

function createRecipeApp(fetch, hash = '') {
  return loadApp({ fetch, hash });
}

test('toggling a favourite sends return=representation and keeps the new state', async () => {
  const calls = [];
  const app = createRecipeApp(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, [{ id: 7, favorite: true }]);
  });
  const recipe = { id: 7, favorite: false };
  app.recipes = [recipe];

  await app.toggleFavorite(recipe);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\?id=eq\.7$/);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[0].options.headers.Prefer, 'return=representation');
  assert.deepEqual(JSON.parse(calls[0].options.body), { favorite: true });
  assert.equal(recipe.favorite, true);
  assert.equal(app.favoriteErrorMessage, '');
  assert.equal(app.isFavoriteSaving(recipe), false);
});

test('an HTTP error rolls the favourite back and shows its own message', async () => {
  const app = createRecipeApp(async () => jsonResponse(500, { message: 'boom' }));
  const recipe = { id: 7, favorite: true };
  app.recipes = [recipe];

  await app.toggleFavorite(recipe);

  assert.equal(recipe.favorite, true);
  assert.equal(app.favoriteErrorMessage, 'Obľúbený recept sa nepodarilo aktualizovať. Služba je dočasne nedostupná. Skúste to o chvíľu znova.');
  assert.doesNotMatch(app.favoriteErrorMessage, /Supabase|HTTP|boom/);
  assert.equal(app.isFavoriteSaving(recipe), false);
});

test('an update that changes no rows is treated as a failure', async () => {
  const app = createRecipeApp(async () => jsonResponse(200, []));
  const recipe = { id: 7, favorite: false };
  app.recipes = [recipe];

  await app.toggleFavorite(recipe);

  assert.equal(recipe.favorite, false);
  assert.match(app.favoriteErrorMessage, /Obľúbený recept sa nepodarilo aktualizovať/);
  assert.equal(app.isFavoriteSaving(recipe), false);
});

test('the star is optimistic and ignores clicks while its request is in flight', async () => {
  const pending = deferred();
  let callCount = 0;
  const app = createRecipeApp(async () => {
    callCount += 1;
    return pending.promise;
  });
  const recipe = { id: 7, favorite: false };
  const other = { id: 8, favorite: false };
  app.recipes = [recipe, other];

  const first = app.toggleFavorite(recipe);
  assert.equal(recipe.favorite, true);
  assert.equal(app.isFavoriteSaving(recipe), true);
  assert.equal(app.isFavoriteSaving(other), false);

  await app.toggleFavorite(recipe);
  assert.equal(callCount, 1);
  assert.equal(recipe.favorite, true);

  pending.resolve(jsonResponse(200, [{ id: 7, favorite: true }]));
  await first;

  assert.equal(recipe.favorite, true);
  assert.equal(app.isFavoriteSaving(recipe), false);
});

test('favourite errors never use the recipe load error', async () => {
  const app = createRecipeApp(async () => jsonResponse(500, {}));
  const recipe = { id: 7, favorite: false };
  app.recipes = [recipe];

  await app.toggleFavorite(recipe);

  assert.equal(app.errorMessage, '');
  assert.notEqual(app.favoriteErrorMessage, '');
});

test('a new favourite attempt clears the previous favourite error', async () => {
  let fail = true;
  const app = createRecipeApp(async () => (fail ? jsonResponse(500, {}) : jsonResponse(200, [{ id: 7 }])));
  const recipe = { id: 7, favorite: false };
  app.recipes = [recipe];

  await app.toggleFavorite(recipe);
  assert.notEqual(app.favoriteErrorMessage, '');

  fail = false;
  await app.toggleFavorite(recipe);
  assert.equal(app.favoriteErrorMessage, '');
  assert.equal(recipe.favorite, true);
});
