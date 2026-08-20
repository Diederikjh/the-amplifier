import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDirectory = path.join(root, 'content');
const websiteDirectory = path.join(root, 'website');
const templatePath = path.join(root, 'template.html');
const outputPath = path.join(websiteDirectory, 'index.html');
const previewContentPath = path.join(contentDirectory, 'extras', 'edition-2.md');
const previewTemplatePath = path.join(root, 'edition-2-template.html');
const previewOutputPath = path.join(websiteDirectory, 'edition-2.html');

function parseDocument(source, filename) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`${filename} must begin with a YAML-style metadata block.`);
  }

  const metadata = {};

  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    metadata[key] = value;
  }

  for (const required of ['id', 'chapter', 'layout', 'theme']) {
    if (!metadata[required]) {
      throw new Error(`${filename} is missing the “${required}” metadata field.`);
    }
  }

  return { metadata, markdown: match[2].trim() };
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function linkedImage({ src, alt, dimensions = '', loadingAttributes = 'loading="lazy"' }) {
  return `<a class="image-link" href="${escapeHtml(src)}" target="_blank" rel="noopener" title="Open full-size image in a new tab">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" ${dimensions} ${loadingAttributes}>
        <span class="visually-hidden">Open full-size image in a new tab.</span>
      </a>`;
}

function imageFigure(metadata, className = '') {
  if (!metadata.image) return '';

  const loadingAttributes = metadata.layout === 'hero'
    ? 'loading="eager" fetchpriority="high"'
    : 'loading="lazy"';
  const dimensions = metadata.image_width && metadata.image_height
    ? `width="${escapeHtml(metadata.image_width)}" height="${escapeHtml(metadata.image_height)}"`
    : '';

  return `
    <figure class="chapter__visual ${className}">
      ${linkedImage({ src: metadata.image, alt: metadata.alt, dimensions, loadingAttributes })}
      ${metadata.caption ? `<figcaption>${escapeHtml(metadata.caption)}</figcaption>` : ''}
    </figure>`;
}

function featureVisual(metadata) {
  const primary = imageFigure(metadata, 'chapter__visual--primary');
  if (!metadata.secondary_image) return primary;

  return `
    <div class="feature-art">
      ${primary}
      <figure class="chapter__visual chapter__visual--secondary">
        ${linkedImage({
          src: metadata.secondary_image,
          alt: metadata.secondary_alt,
          dimensions: `width="${escapeHtml(metadata.secondary_width)}" height="${escapeHtml(metadata.secondary_height)}"`
        })}
        <figcaption>${escapeHtml(metadata.secondary_caption)}</figcaption>
      </figure>
    </div>`;
}

function decorativeVisual(layout, metadata) {
  if (layout === 'feature') return featureVisual(metadata);
  if (metadata.image) return imageFigure(metadata);

  if (layout === 'profile') {
    return `
      <div class="identity-signal" aria-hidden="true">
        <span class="identity-signal__ring"></span>
        <span class="identity-signal__ring"></span>
        <span class="identity-signal__ring"></span>
        <strong>A</strong>
      </div>`;
  }

  if (layout === 'dossier') {
    return `
      <div class="dossier-mark" aria-hidden="true">
        <span>?</span>
        <i></i><i></i><i></i><i></i>
      </div>`;
  }

  return '';
}

function renderSection(document) {
  const { metadata, markdown } = document;
  const body = marked.parse(markdown, {
    gfm: true,
    breaks: false
  });
  const visual = decorativeVisual(metadata.layout, metadata);
  const hasVisual = visual ? ' chapter--has-visual' : '';

  return `
    <section class="chapter chapter--${escapeHtml(metadata.layout)} chapter--${escapeHtml(metadata.theme)}${hasVisual}" id="${escapeHtml(metadata.id)}">
      <div class="chapter__inner">
        <article class="chapter__copy">
          <p class="eyebrow">${escapeHtml(metadata.chapter)}</p>
          ${body}
        </article>
        ${visual}
      </div>
    </section>`;
}

function renderPreview(document) {
  const { metadata, markdown } = document;
  const introduction = marked.parse(markdown, {
    gfm: true,
    breaks: false
  });
  const dimensions = `width="${escapeHtml(metadata.panel_width)}" height="${escapeHtml(metadata.panel_height)}"`;
  const panels = [1, 2, 3].map((number) => {
    const src = metadata[`panel_${number}`];
    const alt = metadata[`panel_${number}_alt`];
    const label = metadata[`panel_${number}_label`];
    const caption = metadata[`panel_${number}_caption`];

    if (!src || !alt || !label || !caption) {
      throw new Error(`edition-2.md is missing metadata for panel ${number}.`);
    }

    return `
      <figure class="preview-panel preview-panel--${number}">
        ${linkedImage({ src, alt, dimensions })}
        <figcaption>
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(caption)}</p>
        </figcaption>
      </figure>`;
  }).join('\n');

  return `
  <main id="${escapeHtml(metadata.id)}">
    <section class="preview-intro">
      <div class="preview-intro__inner">
        <p class="eyebrow">${escapeHtml(metadata.chapter)}</p>
        <div class="preview-intro__copy">
          ${introduction}
        </div>
      </div>
    </section>
    <section class="preview-sequence" aria-label="The defeat of The Obfuscator in three panels">
      ${panels}
    </section>
    <section class="preview-ending">
      <p>${escapeHtml(metadata.ending)}</p>
      <a href="index.html">Return to Issue 1</a>
    </section>
  </main>`;
}

const filenames = (await readdir(contentDirectory))
  .filter((filename) => filename.endsWith('.md'))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (filenames.length === 0) {
  throw new Error('No Markdown files were found in content/.');
}

const documents = await Promise.all(
  filenames.map(async (filename) => {
    const source = await readFile(path.join(contentDirectory, filename), 'utf8');
    return parseDocument(source, filename);
  })
);

const template = await readFile(templatePath, 'utf8');
const sections = documents.map(renderSection).join('\n');
const buildDate = new Date().toISOString();
const generated = template
  .replace('<!-- GENERATED_CONTENT -->', sections)
  .replace('<!-- BUILD_DATE -->', buildDate);

const previewSource = await readFile(previewContentPath, 'utf8');
const previewDocument = parseDocument(previewSource, 'edition-2.md');
const previewTemplate = await readFile(previewTemplatePath, 'utf8');
const previewGenerated = previewTemplate
  .replace('<!-- PAGE_DESCRIPTION -->', escapeHtml(previewDocument.metadata.description))
  .replace('<!-- PAGE_TITLE -->', escapeHtml(previewDocument.metadata.title))
  .replace('<!-- GENERATED_CONTENT -->', renderPreview(previewDocument))
  .replace('<!-- BUILD_DATE -->', buildDate);

await Promise.all([
  writeFile(outputPath, generated, 'utf8'),
  writeFile(previewOutputPath, previewGenerated, 'utf8')
]);

console.log(`Built ${path.relative(root, outputPath)} from ${filenames.length} Markdown files.`);
console.log(`Built ${path.relative(root, previewOutputPath)} from content/extras/edition-2.md.`);
