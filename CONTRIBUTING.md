# Contributing to hamMňam

hamMňam is a static web app: Alpine.js and Tailwind CSS load from their CDNs, and recipes are stored in Supabase through its REST API. There is no build step.

## Project layout

```text
.
├── index.html          # App layout and CDN references
├── manifest.json       # PWA install metadata
├── sw.js               # Offline app-shell cache
├── config.js           # Supabase URL and publishable/anon key
├── js/
│   └── app.js          # Alpine component, REST calls, filters, translations
├── tests/
│   ├── test-recipe-details.js # Recipe detail state and Supabase payload tests
│   └── test-connection.js     # Supabase connection check
├── scripts/
│   └── create-pr.sh    # Opens a PR with a typed title and the PR template
└── icons/
    └── app-icon.svg    # PWA and browser icon
```

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
2. Publish the repository root (or configure Pages to publish the folder containing `index.html`). Keep the relative `./` asset paths if deploying under a project subpath. The Actions workflow runs pre-deploy checks but does not perform or gate a GitHub Pages deployment; Pages deployment is configured separately.
3. Serve the site over HTTPS. The service worker caches the static app shell for repeat visits and offline navigation; Supabase data operations still require a network connection.
