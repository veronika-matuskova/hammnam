<!--
PR title format: <type>: <short description>
  fix:      bug fix
  feat:     new feature
  ui:       UI / styling
  i18n:     translations (CZ/SK)
  refactor: refactor / cleanup
  chore:    docs / config / CI
Example: fix: Correct SJ calculation for recipes without servings
-->

## Summary

<!-- What does this PR change, and why? -->

## Related issue

<!-- e.g. Closes #123 -->

## Screenshots

<!-- For UI changes, add before/after screenshots (mobile and desktop if relevant). -->

## Checklist

- [ ] Recipe detail tests pass locally: `node --test tests/test-recipe-details.js`
- [ ] Tested in the browser (including a mobile-width viewport)
- [ ] New or changed UI text is translated in both CZ and SK in `js/app.js`
- [ ] If app-shell files changed (`index.html`, `js/`, `icons/`, `manifest.json`), `CACHE_NAME` in `sw.js` is bumped
- [ ] Nutrition values (SJ, carbohydrates, glycemic index, etc.) are calculated and displayed correctly
- [ ] If the Supabase schema or payloads changed, the database and Row Level Security policies are updated to match
- [ ] No secrets added — `config.js` holds only the public URL and publishable/anon key
- [ ] README updated if setup, layout or behaviour changed

## Notes for reviewers

<!-- Anything that needs special attention, follow-ups, or known limitations. -->
