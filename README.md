# The Amplifier website mockup

A framework-free static website generated from Markdown content.

## Edit the copy

The main reader-facing story copy lives in the numbered files under `content/`. Edit those Markdown files rather than editing `index.html` directly.

## Build the site

```sh
npm install
npm run build
```

The build writes the complete static pages to `website/index.html` and `website/edition-2.html`.

## Preview locally

```sh
npm run dev
```

Then open <http://localhost:4173>. Press `Ctrl+C` in the terminal to stop the server.

## Project structure

- `content/` — editable Markdown copy and section metadata
- `content/extras/` — editable copy for bonus pages such as the Edition 2 preview
- `template.html` and `edition-2-template.html` — HTML document shells
- `scripts/build.mjs` — Markdown-to-HTML build step
- `website/` — the complete public site and GitHub Pages document root
- `website/styles.css` — responsive visual design
- `website/index.html` — generated main page
- `website/edition-2.html` — generated easter-egg preview page
- `website/img/` — artwork stored directly in the published folder

The images are moved into `website/img/` permanently; the build does not copy them. The local preview server and GitHub Pages workflow expose only `website/`, so authoring files and project documentation are not publicly served.

## Publish with GitHub Pages

The workflow at `.github/workflows/pages.yml` publishes only the `website/` folder after changes reach `main`. In the repository’s GitHub settings, select **Settings → Pages → Source → GitHub Actions** once to enable workflow deployments.
