# Contributing to hamMňam

hamMňam is a static web app: Alpine.js and Tailwind CSS load from their CDNs, and recipes are stored in Supabase through its REST API. Family members sign in with a Supabase Auth magic link, also over plain REST (no Supabase client library). There is no build step.

## Project layout

```text
.
├── index.html          # App layout and CDN references
├── manifest.json       # PWA install metadata
├── sw.js               # Offline app-shell cache
├── config.js           # Supabase URL and publishable/anon key
├── js/
│   └── app.js          # Alpine component, REST and Auth calls, filters, translations
├── supabase/
│   └── migrations/     # SQL for the recipes table, allow-list and RLS policies
├── tests/
│   ├── test-recipe-details.js # Recipe detail state and Supabase payload tests
│   ├── test-auth.js           # Magic-link sign-in, session refresh and sign-out
│   ├── test-*.js              # Other unit tests (node --test, no network)
│   └── test-connection.js     # Supabase connection check (needs network)
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

To run every unit test (all of them stub `fetch`, so nothing reaches Supabase), skip the connection check:

```sh
node --test $(ls tests/test-*.js | grep -v test-connection)
```

## Database migrations

The Supabase schema and its Row Level Security (RLS) policies live in `supabase/migrations/` as plain SQL files, applied in file-name order. Every PR that changes the schema, a payload field or a policy adds a new migration file in the same PR; never edit a migration that has already been applied.

- Name new files `YYYYMMDDHHMMSS_short_description.sql` (UTC timestamp), e.g. `supabase migration new add_recipe_tags` creates one.
- `20261112000000_recipes_baseline.sql` was **reconstructed from the app code**, not dumped. Verify it against the live project with `supabase db dump --schema public` and replace it with the dump if they differ. It describes tables that already exist in production, so mark it as applied there instead of running it: `supabase migration repair --status applied 20261112000000`.

Apply migrations with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```sh
supabase login
supabase link --project-ref <project-ref>   # the subdomain of the URL in config.js
supabase db push --dry-run                   # shows which migrations would run
supabase db push
```

Without the CLI, open **SQL Editor** in the Supabase dashboard and run each new file's contents in order. Afterwards check **Authentication → Policies** for the expected policies.

## Sign-in and write access

Anyone can read recipes. Creating, editing and starring recipes needs a signed-in user whose e-mail is in the `public.allowed_users` table; RLS enforces this, and the app hides the write controls when signed out or not allowed.

- Sign-in uses magic links (`POST /auth/v1/otp` with `create_user: false`), so every family member needs an account in **Authentication → Users** (*Add user → Send invitation* or *Create new user*) and a row in the allow-list:

  ```sql
  insert into public.allowed_users (email) values ('name@example.com');
  ```

- In **Authentication → URL Configuration** set the *Site URL* to `https://hammnam.app` (see `CNAME`) and add `https://hammnam.app/` (and `http://localhost:*` for local testing) to the *Redirect URLs*.
- The session (access and refresh token) is stored in `localStorage` under `hamMnam-session`. Writes send the access token in the `Authorization` header; reads use the publishable key.

## Pull requests

Open PRs with `scripts/create-pr.sh` from your feature branch. It needs the [GitHub CLI](https://cli.github.com) (`gh auth login`). Run `scripts/create-pr.sh --help` for the options and the allowed title types; the types and the PR checklist are defined in [`.github/pull_request_template.md`](.github/pull_request_template.md).

## Deployment (GitHub Pages)

1. Set the Supabase project URL and publishable/anon key in `config.js`. A browser-visible anon/publishable key is expected; data is protected by the RLS policies in `supabase/migrations/` (see above).
2. Publish the repository root (or configure Pages to publish the folder containing `index.html`). Keep the relative `./` asset paths if deploying under a project subpath. The Actions workflow runs pre-deploy checks but does not perform or gate a GitHub Pages deployment; Pages deployment is configured separately.
3. Serve the site over HTTPS. The service worker caches the static app shell for repeat visits and offline navigation; Supabase data operations still require a network connection.
