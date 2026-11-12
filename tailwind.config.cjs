/** Tailwind CSS v3 config. index.html had no inline tailwind.config, so the default theme is used. */
module.exports = {
  // Class names also appear in Alpine `:class` bindings and in js/app.js string literals (e.g. giClass).
  content: ['./index.html', './js/app.js'],
  theme: {
    extend: {}
  },
  plugins: []
};
