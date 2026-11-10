# hamMňam

A lightweight static recipe manager focused on nutritional values (carbohydrate units / SJ, carbohydrates, and glycemic index). It uses Alpine.js and Tailwind CSS from CDNs, with Supabase's REST API for recipe storage.

## Project layout

```text
.
├── index.html          # App layout and CDN references
├── manifest.json       # PWA install metadata
├── sw.js               # Offline app-shell cache
├── config.js           # Supabase URL and publishable/anon key
├── js/
│   └── app.js          # Alpine component, REST calls, filters, CZ/SK text
└── icons/
    └── app-icon.svg    # PWA and browser icon
```

## GitHub Pages setup

1. Set the Supabase project URL and publishable/anon key in `config.js`. A browser-visible anon/publishable key is expected; protect data with appropriate Supabase Row Level Security policies.
2. Publish the repository root (or configure Pages to publish the folder containing `index.html`). Keep the relative `./` asset paths if deploying under a project subpath.
3. Serve the site over HTTPS. The service worker caches the static app shell for repeat visits and offline navigation; Supabase data operations still require a network connection.

No Node.js build step is required. Tailwind CSS and Alpine.js are loaded from their CDNs.
