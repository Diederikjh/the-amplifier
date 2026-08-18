# The Amplifier website mockup

A framework-free static website generated from Markdown content.

## Edit the copy

The main reader-facing story copy lives in the numbered files under `content/`. Edit those Markdown files rather than editing `index.html` directly.

## Build the site

```sh
npm install
npm run build
```

The build writes the complete static page to `index.html`.

## Preview locally

```sh
npm run dev
```

Then open <http://localhost:4173>. Press `Ctrl+C` in the terminal to stop the server.

## Project structure

- `content/` — editable Markdown copy and section metadata
- `template.html` — shared HTML document shell
- `scripts/build.mjs` — Markdown-to-HTML build step
- `styles.css` — responsive visual design
- `index.html` — generated static website
- `img/` — website artwork

The generated `index.html`, `styles.css`, and `img/` directory can be hosted directly with GitHub Pages.
