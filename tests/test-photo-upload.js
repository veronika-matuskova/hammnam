// Uploading a recipe photo to Supabase Storage from the form.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp, signedInSession, jsonResponse, networkError } = require('./helpers/app-harness');

function photoFile(type = 'image/jpeg', size = 200_000) {
  return { type, size, name: 'photo.jpg' };
}

function fileEvent(file) {
  return { target: { files: file ? [file] : [], value: 'C:\\fakepath\\photo.jpg' } };
}

function openForm(fetch) {
  const app = loadApp({ fetch, session: signedInSession() });
  app.openForm();
  return app;
}

test('a photo is uploaded to the recipe-photos bucket and its public URL fills the form', async () => {
  const calls = [];
  const app = openForm(async (url, options) => { calls.push({ url, options }); return jsonResponse(200, { Key: 'x' }); });
  const file = photoFile();
  const event = fileEvent(file);
  await app.uploadPhoto(event);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/recipe-photos\/\d+-[a-z0-9-]+\.jpg$/);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-token');
  assert.equal(calls[0].options.headers['Content-Type'], 'image/jpeg');
  assert.equal(calls[0].options.body, file);
  const path = calls[0].url.split('/recipe-photos/')[1];
  assert.equal(app.newRecipe.photo, `https://example.supabase.co/storage/v1/object/public/recipe-photos/${path}`);
  assert.equal(app.photoUploading, false);
  assert.equal(app.photoError, '');
  assert.equal(event.target.value, '');
});

test('non-images and photos over 5 MB are refused before uploading', async () => {
  const calls = [];
  const app = openForm(async (url) => { calls.push(url); return jsonResponse(200, {}); });
  await app.uploadPhoto(fileEvent({ type: 'application/pdf', size: 100, name: 'a.pdf' }));
  assert.equal(app.photoError, app.t('photoWrongType'));
  await app.uploadPhoto(fileEvent(photoFile('image/heic')));
  assert.equal(app.photoError, app.t('photoWrongType'));
  await app.uploadPhoto(fileEvent(photoFile('image/jpeg', 6 * 1024 * 1024)));
  assert.equal(app.photoError, app.t('photoTooLarge'));
  assert.equal(calls.length, 0);
  assert.equal(app.newRecipe.photo, '');
});

test('a failed upload keeps the previous photo and explains why', async () => {
  const app = openForm(async () => jsonResponse(403, { error: 'Unauthorized' }));
  app.newRecipe.photo = 'https://example.com/old.jpg';
  await app.uploadPhoto(fileEvent(photoFile()));
  assert.equal(app.newRecipe.photo, 'https://example.com/old.jpg');
  assert.equal(app.photoError, `${app.t('photoUploadError')} ${app.t('permissionError')}`);

  const offline = openForm(async () => { throw networkError(); });
  await offline.uploadPhoto(fileEvent(photoFile()));
  assert.equal(offline.photoError, `${offline.t('photoUploadError')} ${offline.t('connectionError')}`);
});

test('a rejected token is refreshed once and the upload retried', async () => {
  const uploads = [];
  const app = openForm(async (url, options) => {
    if (url.includes('/auth/v1/token')) return jsonResponse(200, { access_token: 'fresh-token', refresh_token: 'r2', expires_in: 3600 });
    uploads.push(options.headers.Authorization);
    return uploads.length === 1 ? jsonResponse(401, {}) : jsonResponse(200, {});
  });
  await app.uploadPhoto(fileEvent(photoFile('image/png')));
  assert.deepEqual(uploads, ['Bearer user-token', 'Bearer fresh-token']);
  assert.match(app.newRecipe.photo, /\.png$/);
});
