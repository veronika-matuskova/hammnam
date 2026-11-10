const fs = require('node:fs');
const vm = require('node:vm');

const config = { window: {} };
vm.runInNewContext(fs.readFileSync('config.js', 'utf8'), config);

const { url, anonKey } = config.window.SUPABASE_CONFIG || {};
if (typeof url !== 'string' || typeof anonKey !== 'string' || !url.trim() || !anonKey.trim()) {
  console.error('Supabase connection test failed: set url and anonKey in config.js.');
  process.exit(1);
}

const projectUrl = new URL(url.trim());
projectUrl.pathname = projectUrl.pathname.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const endpoint = new URL(`${projectUrl.href.replace(/\/$/, '')}/rest/v1/recipes`);
endpoint.searchParams.set('select', 'id');
endpoint.searchParams.set('limit', '1');

fetch(endpoint, {
  headers: {
    apikey: anonKey.trim(),
    Authorization: `Bearer ${anonKey.trim()}`
  },
  signal: AbortSignal.timeout(10000)
})
  .then(async (response) => {
    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      throw new Error(`Supabase returned HTTP ${response.status}${details ? `: ${details}` : ''}`);
    }

    console.log(`Supabase connection test passed (HTTP ${response.status} at ${endpoint.host}).`);
  })
  .catch((error) => {
    console.error(`Supabase connection test failed: ${error.message}`);
    process.exitCode = 1;
  });
