const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, jsonResponse, signedInSession, SESSION_KEY } = require('./helpers/app-harness');

const nowSeconds = () => Math.floor(Date.now() / 1000);

function createRecipeApp(fetch, { initialHash = '', session = null } = {}) {
  return loadApp({ fetch, hash: initialHash, session });
}

// Routes stubbed Supabase calls by URL; records every call. Nothing leaves the process.
function router(routes) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    calls.push({ url, options });
    for (const [pattern, handler] of routes) {
      if (pattern.test(url)) return handler(url, options);
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return { fetch, calls };
}

test('signed out: no write controls and writes fall back to the publishable key', async () => {
  const { fetch, calls } = router([[/\/rest\/v1\/recipes/, () => jsonResponse(200, [{ id: 7, favorite: true }])]]);
  const app = createRecipeApp(fetch);

  assert.equal(app.isSignedIn, false);
  assert.equal(app.canEdit, false);

  await app.toggleFavorite({ id: 7, favorite: false });
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
});

test('requesting a magic link posts the email to /auth/v1/otp without creating users', async () => {
  const { fetch, calls } = router([[/\/auth\/v1\/otp/, () => jsonResponse(200, {})]]);
  const app = createRecipeApp(fetch);
  app.openSignIn();
  app.signInEmail = '  Mama@Example.com ';

  await app.requestMagicLink();

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `https://example.supabase.co/auth/v1/otp?redirect_to=${encodeURIComponent('https://hammnam.app/')}`
  );
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.apikey, 'test-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'mama@example.com', create_user: false });
  assert.equal(app.magicLinkSent, true);
  assert.equal(app.authSending, false);
  assert.equal(app.authError, '');
});

test('an invalid email is rejected without a request', async () => {
  const { fetch, calls } = router([]);
  const app = createRecipeApp(fetch);
  app.signInEmail = 'not-an-email';

  await app.requestMagicLink();

  assert.equal(calls.length, 0);
  assert.equal(app.authError, 'Zadajte platnú e-mailovú adresu.');
  assert.equal(app.magicLinkSent, false);
});

test('a failed magic link request shows a Slovak error', async () => {
  const { fetch } = router([[/\/auth\/v1\/otp/, () => jsonResponse(422, { msg: 'Signups not allowed for otp' })]]);
  const app = createRecipeApp(fetch);
  app.signInEmail = 'cudzi@example.com';

  await app.requestMagicLink();

  // Friendly text only (#15); the technical response goes to the console.
  assert.equal(app.authError, 'Prihlasovací odkaz sa nepodarilo odoslať. Tento e-mail nemá do aplikácie prístup. Požiadajte správcu o pridanie.');
  assert.doesNotMatch(app.authError, /HTTP|422|Signups/);
  assert.equal(app.magicLinkSent, false);
  assert.equal(app.authSending, false);
});

test('the magic-link redirect is turned into a stored session and cleared from the URL', async () => {
  const { fetch, calls } = router([
    [/\/auth\/v1\/user$/, () => jsonResponse(200, { id: 'u1', email: 'mama@example.com' })],
    [/\/rest\/v1\/rpc\/is_family_member$/, () => jsonResponse(200, true)],
    [/\/rest\/v1\/recipes/, () => jsonResponse(200, [])]
  ]);
  const app = createRecipeApp(fetch, {
    initialHash: '#access_token=jwt-abc&expires_in=3600&refresh_token=r-1&token_type=bearer&type=magiclink'
  });

  await app.init();

  assert.equal(app.location.hash, '');
  assert.equal(app.isSignedIn, true);
  assert.equal(app.canEdit, true);
  assert.equal(app.signedInEmail, 'mama@example.com');
  const saved = JSON.parse(app.store[SESSION_KEY]);
  assert.equal(saved.access_token, 'jwt-abc');
  assert.equal(saved.refresh_token, 'r-1');
  assert.ok(saved.expires_at > nowSeconds() + 3500);

  const userCall = calls.find((call) => call.url.endsWith('/auth/v1/user'));
  assert.equal(userCall.options.headers.Authorization, 'Bearer jwt-abc');
  // Reading recipes is public and keeps using the publishable key.
  const listCall = calls.find((call) => call.url.includes('/rest/v1/recipes'));
  assert.equal(listCall.options.headers.Authorization, 'Bearer test-key');
});

test('an error in the magic-link redirect is shown in the sign-in panel', async () => {
  const { fetch } = router([[/\/rest\/v1\/recipes/, () => jsonResponse(200, [])]]);
  const app = createRecipeApp(fetch, {
    initialHash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
  });

  await app.init();

  assert.equal(app.location.hash, '');
  assert.equal(app.isSignedIn, false);
  assert.equal(app.showSignIn, true);
  assert.equal(app.authError, 'Prihlasovací odkaz sa nepodarilo odoslať. Odkaz je neplatný alebo vypršal. Vyžiadajte si nový.');
});

test('a stored session is restored and writes send the user token', async () => {
  const { fetch, calls } = router([[/\/rest\/v1\/recipes/, () => jsonResponse(200, [{ id: 7, favorite: true }])]]);
  const app = createRecipeApp(fetch, { session: signedInSession() });

  assert.equal(app.isSignedIn, true);
  assert.equal(app.canEdit, true);

  await app.toggleFavorite({ id: 7, favorite: false });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.apikey, 'test-key');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-token');
});

test('an expiring token is refreshed once before writes', async () => {
  const { fetch, calls } = router([
    [/\/auth\/v1\/token\?grant_type=refresh_token$/, () => jsonResponse(200, {
      access_token: 'fresh-token', refresh_token: 'refresh-2', expires_in: 3600
    })],
    [/\/rest\/v1\/recipes/, (url, options) => jsonResponse(200, [{ id: 7, ...JSON.parse(options.body) }])]
  ]);
  const app = createRecipeApp(fetch, { session: signedInSession({ expires_at: nowSeconds() + 10 }) });

  await Promise.all([
    app.toggleFavorite({ id: 7, favorite: false }),
    app.toggleFavorite({ id: 8, favorite: false })
  ]);

  const refreshCalls = calls.filter((call) => call.url.includes('/auth/v1/token'));
  assert.equal(refreshCalls.length, 1);
  assert.deepEqual(JSON.parse(refreshCalls[0].options.body), { refresh_token: 'refresh-1' });
  const writes = calls.filter((call) => call.url.includes('/rest/v1/recipes'));
  assert.equal(writes.length, 2);
  for (const write of writes) assert.equal(write.options.headers.Authorization, 'Bearer fresh-token');
  const saved = JSON.parse(app.store[SESSION_KEY]);
  assert.equal(saved.access_token, 'fresh-token');
  assert.equal(saved.refresh_token, 'refresh-2');
  assert.equal(saved.user.email, 'mama@example.com');
});

test('a rejected refresh token signs out and the write fails with a clear message', async () => {
  const { fetch, calls } = router([
    [/\/auth\/v1\/token/, () => jsonResponse(400, { error: 'invalid_grant' })]
  ]);
  const app = createRecipeApp(fetch, { session: signedInSession({ expires_at: nowSeconds() - 5 }) });
  const recipe = { id: 7, favorite: false };

  await app.toggleFavorite(recipe);

  assert.equal(calls.filter((call) => call.url.includes('/rest/v1/recipes')).length, 0);
  assert.equal(recipe.favorite, false);
  assert.match(app.favoriteErrorMessage, /Prihlásenie vypršalo/);
  assert.equal(app.isSignedIn, false);
  assert.equal(app.canEdit, false);
  assert.equal(app.showSignIn, true);
  assert.equal(app.store[SESSION_KEY], undefined);
});

test('a server error during refresh keeps the session', async () => {
  const { fetch } = router([[/\/auth\/v1\/token/, () => jsonResponse(503, {})]]);
  const app = createRecipeApp(fetch, { session: signedInSession({ expires_at: nowSeconds() - 5 }) });
  const recipe = { id: 7, favorite: false };

  await app.toggleFavorite(recipe);

  assert.doesNotMatch(app.favoriteErrorMessage, /HTTP|503/);
  assert.match(app.favoriteErrorMessage, /^Obľúbený recept sa nepodarilo aktualizovať\. /);
  assert.equal(app.isSignedIn, true);
});

test('a 401 on a write refreshes the token and retries once', async () => {
  let writes = 0;
  const { fetch, calls } = router([
    [/\/auth\/v1\/token/, () => jsonResponse(200, { access_token: 'fresh-token', refresh_token: 'refresh-2', expires_in: 3600 })],
    [/\/rest\/v1\/recipes/, () => {
      writes += 1;
      return writes === 1 ? jsonResponse(401, { message: 'JWT expired' }) : jsonResponse(200, [{ id: 7, favorite: true }]);
    }]
  ]);
  const app = createRecipeApp(fetch, { session: signedInSession() });
  const recipe = { id: 7, favorite: false };

  await app.toggleFavorite(recipe);

  const writeCalls = calls.filter((call) => call.url.includes('/rest/v1/recipes'));
  assert.deepEqual(writeCalls.map((call) => call.options.headers.Authorization), ['Bearer user-token', 'Bearer fresh-token']);
  assert.equal(recipe.favorite, true);
  assert.equal(app.favoriteErrorMessage, '');
});

test('a signed-in user who is not on the allow-list gets no write controls', async () => {
  const { fetch } = router([
    [/\/rest\/v1\/rpc\/is_family_member$/, () => jsonResponse(200, false)],
    [/\/rest\/v1\/recipes/, () => jsonResponse(200, [])]
  ]);
  const app = createRecipeApp(fetch, { session: signedInSession() });

  await app.init();

  assert.equal(app.isSignedIn, true);
  assert.equal(app.familyMember, false);
  assert.equal(app.canEdit, false);
});

test('a missing allow-list function keeps write controls for signed-in users', async () => {
  const { fetch } = router([
    [/\/rest\/v1\/rpc\/is_family_member$/, () => jsonResponse(404, { message: 'not found' })],
    [/\/rest\/v1\/recipes/, () => jsonResponse(200, [])]
  ]);
  const app = createRecipeApp(fetch, { session: signedInSession() });

  await app.init();

  assert.equal(app.familyMember, null);
  assert.equal(app.canEdit, true);
});

test('signing out clears the session and revokes it on the server', async () => {
  const { fetch, calls } = router([[/\/auth\/v1\/logout$/, () => jsonResponse(204, null)]]);
  const app = createRecipeApp(fetch, { session: signedInSession() });
  app.familyMember = true;

  await app.signOut();

  assert.equal(app.isSignedIn, false);
  assert.equal(app.canEdit, false);
  assert.equal(app.familyMember, null);
  assert.equal(app.store[SESSION_KEY], undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-token');
});

test('a corrupt stored session is ignored', () => {
  const app = loadApp({ fetch: router([]).fetch, storage: { [SESSION_KEY]: '{not json' } });
  assert.equal(app.isSignedIn, false);
});

test('a signed-out save calls fetch synchronously (no extra await before the request)', () => {
  let called = false;
  const app = loadApp({ fetch: () => { called = true; return new Promise(() => {}); } });
  app.openForm();
  app.newRecipe.title_sk = 'Polievka';
  app.newRecipe.category_sk = 'Obed';

  app.addRecipe();

  assert.equal(called, true);
});

test('signed in: a save sends the user token and the form cannot be closed while it is in flight', async () => {
  let release;
  const calls = [];
  const app = loadApp({
    session: signedInSession(),
    fetch: (url, options) => new Promise((resolve) => {
      calls.push({ url, options });
      release = () => resolve(jsonResponse(201, [{ id: 5, ...JSON.parse(options.body) }]));
    })
  });
  app.openForm();
  app.newRecipe.title_sk = 'Polievka';
  app.newRecipe.category_sk = 'Obed';

  const saving = app.addRecipe();
  assert.equal(app.saving, true);
  app.closeForm();
  assert.equal(app.showForm, true);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-token');
  release();
  await saving;
  assert.equal(app.saving, false);
  assert.equal(app.recipes[0].title_sk, 'Polievka');
});
