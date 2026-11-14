// Account page (#account): the header "Účet" button opens it, and it links to
// History (#history) and Logout.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, signedInSession, jsonResponse, readRepoFile } = require('./helpers/app-harness');

function signedInApp(fetch = async () => jsonResponse(200, [])) {
  const app = loadApp({ fetch, session: signedInSession() });
  app.familyMember = true;
  return app;
}

test('openAccount shows #account and closeAccount goes back to the list', () => {
  const app = signedInApp();

  app.openAccount();
  assert.equal(app.showAccount, true);
  assert.equal(app.location.hash, '#account');
  assert.equal(app.history.state.hamMnamAccount, true);

  app.closeAccount();
  assert.equal(app.showAccount, false);
  assert.equal(app.location.hash, '');
  assert.equal(app.history.leftApp, false);
});

test('History opened from the account page goes back to the account page', async () => {
  const app = signedInApp();
  app.openAccount();

  await app.openHistory();
  assert.equal(app.showHistory, true);
  assert.equal(app.showAccount, false);

  app.closeHistory();
  assert.equal(app.location.hash, '#account');
});

test('a deep link to #account shows the account page', () => {
  const app = loadApp({ fetch: async () => { throw new Error('no request expected'); }, hash: '#account' });
  app.syncRoute();
  assert.equal(app.showAccount, true);
});

test('Logout on the account page signs out and leaves #account', async () => {
  const calls = [];
  const app = signedInApp(async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return jsonResponse(204);
  });
  app.openAccount();

  await app.signOutFromAccount();

  assert.equal(app.isSignedIn, false);
  assert.equal(app.showAccount, false);
  assert.equal(app.location.hash, '');
  assert.ok(calls.some((call) => call.url.endsWith('/logout') && call.method === 'POST'));
});

test('the header has one Account button instead of separate History and Logout buttons', () => {
  const html = readRepoFile('index.html');
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.match(header, /openAccount\(\)/);
  assert.doesNotMatch(header, /openHistory\(\)/);
  assert.doesNotMatch(header, /signOut\(\)/);
  const account = html.slice(html.indexOf('aria-labelledby="account-title"'));
  assert.match(account.slice(0, account.indexOf('</main>')), /openHistory\(\)[\s\S]*signOutFromAccount\(\)/);
});
