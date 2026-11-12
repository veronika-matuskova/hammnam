# Contributing to hamMňam

hamMňam is a static web app built with Alpine.js and Tailwind CSS; recipes are stored in Supabase through its REST API. A small build step (`scripts/build.mjs`) compiles the Tailwind CSS, bundles a pinned Alpine.js and writes the deployable site to `dist/`.

## Project layout

```text
.
├── index.html          # App layout; asset URLs are rewritten to hashed files by the build
├── manifest.json       # PWA install metadata
├── sw.js               # Offline app-shell cache (template; the build fills in the precache list)
├── package.json        # Pinned build dependencies (tailwindcss, alpinejs)
├── tailwind.config.cjs # Tailwind CSS config (scans index.html and js/app.js)
├── src/
│   └── styles.css      # Tailwind CSS entry point
├── config.js           # Supabase URL and publishable/anon key
├── js/
│   └── app.js          # Alpine component, REST calls, filters, translations
├── tests/
│   ├── test-recipe-details.js # Recipe detail state and Supabase payload tests
│   └── test-connection.js     # Supabase connection check
├── scripts/
│   ├── build.mjs       # Builds dist/
│   └── create-pr.sh    # Opens a PR with a typed title and the PR template
└── icons/
    └── app-icon.svg    # PWA and browser icon
```

## Build and local development

Requires Node.js 20 or newer.

```sh
npm install
npm run build
npx serve dist   # or any static server, e.g. python3 -m http.server -d dist
```

Open the served `dist/`, not `index.html` from the repository root: the root page references `./assets/app.css` and `./assets/alpine.js`, which only exist after a build. Rebuild after changing `index.html`, `js/app.js`, `config.js`, `manifest.json` or `icons/`.

The build:

- compiles Tailwind CSS v3 (minified) from `src/styles.css`, scanning `index.html` and `js/app.js` for class names, including `:class` bindings and class strings in `js/app.js` (build complete class names; don't concatenate them);
- copies Alpine.js from `node_modules` and fails if the installed version differs from the exact version pinned in `package.json`;
- writes CSS and JS to `dist/assets/` with content hashes in their file names and rewrites the URLs in `dist/index.html`;
- writes `dist/sw.js` with the precache list and a cache name derived from the built files, so there are no `?v=` or `CACHE_NAME` bumps to do by hand;
- fails if `dist/index.html`, the manifest icons or the precache list reference a file that is missing from `dist/`.

To check the build without installing dependencies, pass stand-in files: `node scripts/build.mjs --css=some.css --alpine=some.js`.

To upgrade Tailwind CSS or Alpine.js, change the exact version in `package.json` and run `npm install`.

## Language

The UI is currently Slovak only. Czech texts are still kept in `js/app.js`; to bring back the language switch, add `'cs'` to `ENABLED_LANGUAGES` there. With Czech enabled, the switch button and the Czech name/category fields in the recipe form reappear automatically.

## Tests

The GitHub Actions pre-deploy check runs the recipe detail tests before checking the Supabase connection. Run the recipe detail tests locally with Node.js:

```sh
node --test tests/test-recipe-details.js
```

## Pull requests

Open PRs with `scripts/create-pr.sh` from your feature branch. It needs the [GitHub CLI](https://cli.github.com) (`gh auth login`). Run `scripts/create-pr.sh --help` for the options and the allowed title types; the types and the PR checklist are defined in [`.github/pull_request_template.md`](.github/pull_request_template.md).

## Deployment (GitHub Pages)

1. Set the Supabase project URL and publishable/anon key in `config.js`. A browser-visible anon/publishable key is expected; protect data with appropriate Supabase Row Level Security policies.
2. Publish the built `dist/` folder (`npm install && npm run build`), not the repository root. Keep the relative `./` asset paths if deploying under a project subpath.
3. Serve the site over HTTPS. The service worker caches the static app shell for repeat visits and offline navigation; Supabase data operations still require a network connection.
