import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDirectory = path.join(root, 'content');
const templatePath = path.join(root, 'template.html');
const outputPath = path.join(root, 'index.html');

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
      <img src="${escapeHtml(metadata.image)}" alt="${escapeHtml(metadata.alt)}" ${dimensions} ${loadingAttributes}>
      ${metadata.caption ? `<figcaption>${escapeHtml(metadata.caption)}</figcaption>` : ''}
    </figure>`;
}

function homeworkPlaceholder(metadata) {
  return `
    <figure class="chapter__visual homework-art" role="img" aria-label="${escapeHtml(metadata.alt)}">
      <div class="homework-art__window" aria-hidden="true"></div>
      <div class="homework-art__cape" aria-hidden="true"></div>
      <div class="homework-art__person homework-art__person--hero" aria-hidden="true"><span></span></div>
      <div class="homework-art__person homework-art__person--child" aria-hidden="true"><span></span></div>
      <div class="homework-art__table" aria-hidden="true">
        <div class="homework-art__book"></div>
        <div class="homework-art__pencil"></div>
        <div class="homework-art__mug"></div>
      </div>
      <div class="homework-art__equipment" aria-hidden="true"></div>
      <figcaption>Concept artwork placeholder · ready for the final homework scene</figcaption>
    </figure>`;
}

function featureVisual(metadata) {
  const primary = imageFigure(metadata, 'chapter__visual--primary');
  if (!metadata.secondary_image) return primary;

  return `
    <div class="feature-art">
      ${primary}
      <figure class="chapter__visual chapter__visual--secondary">
        <img src="${escapeHtml(metadata.secondary_image)}" alt="${escapeHtml(metadata.secondary_alt)}" width="${escapeHtml(metadata.secondary_width)}" height="${escapeHtml(metadata.secondary_height)}" loading="lazy">
        <figcaption>${escapeHtml(metadata.secondary_caption)}</figcaption>
      </figure>
    </div>`;
}

function decorativeVisual(layout, metadata) {
  if (layout === 'homework') return homeworkPlaceholder(metadata);
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
const generated = template
  .replace('<!-- GENERATED_CONTENT -->', sections)
  .replace('<!-- BUILD_DATE -->', new Date().toISOString());

await writeFile(outputPath, generated, 'utf8');
console.log(`Built ${path.relative(root, outputPath)} from ${filenames.length} Markdown files.`);
