# Contributing to hamMňam

hamMňam is a static web app: Alpine.js and Tailwind CSS load from their CDNs, and recipes are stored in Supabase through its REST API. Family members sign in with a Supabase Auth magic link, also over plain REST (no Supabase client library). There is no build step.

## Project layout

```text
.
├── index.html          # App layout and CDN references
├── food-guide.html    # Educational page: balanced plate, carbohydrate and protein sources (static, Slovak)
├── learn.html         # Educational page: calorie table, SJ, GI, GL (static, Slovak)
├── manifest.json       # PWA install metadata
├── sw.js               # Offline app-shell cache
├── config.js           # Supabase URL and publishable/anon key
├── js/
│   ├── app.js          # Alpine component, REST and Auth calls, filters, translations
│   └── learn.js        # Calculators for learn.html
├── supabase/
│   ├── functions/
│   │   └── import-recipe/  # Edge Function: recipe from a link, in the app's format
│   └── migrations/     # SQL for the recipes table, allow-list and RLS policies
├── tests/
│   ├── test-recipe-details.js # Recipe detail state and Supabase payload tests
│   ├── test-auth.js           # Magic-link sign-in, session refresh and sign-out
│   ├── test-*.js              # Other unit tests (node --test, no network)
│   ├── helpers/app-harness.js # Loads js/app.js in node:vm with stubbed browser globals
│   └── test-connection.js     # Supabase connection check (needs network)
├── supabase/
│   └── migrations/     # Database schema, allow-list and RLS policies, one SQL file per change
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

Tests load the app through `tests/helpers/app-harness.js`. Writes need a signed-in user in the real app; pass `session: signedInSession()` to `loadApp()` to start a test signed in (the session is put in the stubbed `localStorage`, and writes then send its access token).

## Database migrations

Every change to the Supabase schema goes in a new file in `supabase/migrations/`, named `YYYYMMDDHHMMSS_short_description.sql` (UTC timestamp). Never edit a migration that has already been applied; add a new one instead.

`20261112000000_baseline.sql` records the schema as it was before migrations were tracked.

Apply a migration with the Supabase CLI (`supabase link --project-ref bjeboxfypkkhvdqxviip`, then `supabase db push`) or by running the file in the dashboard's SQL editor. Ship the matching `js/app.js` change in the same PR.

Migrations applied through the Supabase dashboard or the Supabase connector are recorded in the project's migration history under their own version; keep the file name here equal to that version (e.g. `20261112221310_family_write_access.sql`).

## Sign-in and write access

Anyone can read recipes. Creating, editing and starring recipes needs a signed-in user whose e-mail is in the `public.allowed_users` table; RLS enforces this, and the app hides the write controls when signed out or not allowed.

### How sign-in works

Sign-in uses Supabase Auth magic links over plain REST (no Supabase JS client):

1. **Request a link.** `requestMagicLink()` sends `POST /auth/v1/otp` with `{ email, create_user: false }` and `redirect_to` set to the app's URL. With `create_user: false` Supabase only e-mails existing accounts; an unknown address gets HTTP 422, shown as "this e-mail has no access".
2. **Open the link.** Supabase verifies the one-time token (single use, expires after the project's e-mail OTP expiry, 1 hour by default) and redirects to the *Site URL* / allowed *Redirect URL* with `access_token`, `refresh_token` and `expires_at` in the URL hash. `consumeAuthRedirect()` stores them and removes them from the address bar.
3. **Stay signed in.** The access token (a JWT, about 1 hour) is refreshed via `POST /auth/v1/token?grant_type=refresh_token` before a write when it expires within 60 s (`SESSION_REFRESH_MARGIN_SECONDS`), or when a write gets HTTP 401. If the refresh token is rejected, the user is signed out and asked to sign in again; a 5xx keeps the session.
4. **Write.** Reads use the publishable key. Writes (`POST`/`PATCH`/`DELETE` on `recipes`) send `Authorization: Bearer <access token>`. RLS policies call `public.is_family_member()`, which checks `auth.jwt() ->> 'email'` (lower-cased) against `public.allowed_users`.
5. **Show controls.** After sign-in the app calls `POST /rest/v1/rpc/is_family_member` and hides new/edit/star when it returns `false`. This is only UX: RLS is the real protection, so a modified client still cannot write.
6. **Sign out.** `POST /auth/v1/logout` ends the session on the server, then the stored session is cleared.

`public.allowed_users` has RLS enabled and no policies, so it cannot be read or changed through the API; `is_family_member()` is `SECURITY DEFINER` so it can read the list, and only ever returns `true`/`false`.

### Adding a family member

1. **Authentication → Users → Add user**: *Send invitation*, or *Create new user* with **Auto Confirm User** on. The dashboard requires a password there; use any long random one, it is never used.
2. Add the e-mail (lower case) to the allow-list in the SQL editor:

   ```sql
   insert into public.allowed_users (email) values ('name@example.com');
   ```

To remove someone, delete their row from `allowed_users` (writes stop immediately) and optionally the user in **Authentication → Users**.

### Configuration

- In **Authentication → URL Configuration** set the *Site URL* to `https://hammnam.app` (see `CNAME`) and add `https://hammnam.app/` (and `http://localhost:*` for local testing) to the *Redirect URLs*.
- The session (access and refresh token) is stored in `localStorage` under `hamMnam-session`. Writes send the access token in the `Authorization` header; reads use the publishable key.

## Import from a link (Edge Function)

**Načítať recept z odkazu** in the new-recipe form calls `POST /functions/v1/import-recipe` with `{ "url": "…" }` and the signed-in user's access token. The function (`supabase/functions/import-recipe/index.ts`):

1. checks the caller with `rpc/is_family_member` (deployed with `verify_jwt = false` because it does this check itself and must answer the CORS preflight);
2. fetches the page (http/https only, no private or local addresses, 5 redirects, 3 MB, 15 s);
3. reads the schema.org `Recipe` JSON-LD, the photo (`image` or `og:image`) and the page text;
4. asks Claude (Anthropic API, forced tool call) to rewrite it in the app's style, using the two newest recipes and the existing categories as examples: Slovak, per-100 g values of the finished dish, GI, GL per portion, notes ending with `Zdroj: <url>`;
5. cleans the answer (rounding, SJ = carbs / 10, GI 0–100, notes ≤ 2000 characters) and returns `{ mode: "ai", recipe }`. It never writes to the database; the app fills the form and the user saves it.

Secrets (**Edge Functions → Secrets**, or `supabase secrets set`):

- `ANTHROPIC_API_KEY` – needed for the full import. Without it the function returns the JSON-LD recipe as published (`mode: "basic"`), untranslated and without values.
- `IMPORT_MODEL` – optional, overrides the Claude model (default `claude-sonnet-5-5`).

Deploy with `supabase functions deploy import-recipe --no-verify-jwt`. Error codes in the response body (`invalid_url`, `no_recipe`, `page_unreachable`, `ai_failed`, `unauthorized`, `forbidden`) are mapped to Slovak messages in `IMPORT_ERROR_KEYS` in `js/app.js`.

## Pull requests

Open PRs with `scripts/create-pr.sh` from your feature branch. It needs the [GitHub CLI](https://cli.github.com) (`gh auth login`). Run `scripts/create-pr.sh --help` for the options and the allowed title types; the types and the PR checklist are defined in [`.github/pull_request_template.md`](.github/pull_request_template.md). The `PR title` workflow fails any PR to `main` whose title is not `<type>: <description>` with one of those types; it re-runs when the title is edited.

## Deployment (GitHub Pages)

1. Set the Supabase project URL and publishable/anon key in `config.js`. A browser-visible anon/publishable key is expected; data is protected by the RLS policies in `supabase/migrations/` (see above).
2. Publish the repository root (or configure Pages to publish the folder containing `index.html`). Keep the relative `./` asset paths if deploying under a project subpath. The Actions workflow runs pre-deploy checks but does not perform or gate a GitHub Pages deployment; Pages deployment is configured separately.
3. Serve the site over HTTPS. The service worker caches the static app shell for repeat visits and offline navigation; Supabase data operations still require a network connection.
