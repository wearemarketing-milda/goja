// Eleventy: generuoja svetainę iš content/ (CMS turinys) į _site/ (tai, ką publikuoja Vercel).
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');
const markdownIt = require('markdown-it');

const md = markdownIt({ html: false, linkify: false, breaks: false, typographer: false });
const ROOT = __dirname;

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fileFor(src) {
  if (!src || !src.startsWith('/')) return null;
  const p = path.join(ROOT, decodeURI(src.split('?')[0]));
  return fs.existsSync(p) ? p : null;
}

function dims(src) {
  const f = fileFor(src);
  if (!f) return null;
  try { return sizeOf(f); } catch { return null; }
}

// Paveikslėlio HTML: matmenys nuskaitomi iš failo; jei yra -720 / -1440 variantai, sukuriamas srcset.
function imageTag(image, opts = {}) {
  if (!image || !image.src) return '';
  const a = [];
  if (opts.cls) a.push(`class="${esc(opts.cls)}"`);
  a.push(`src="${esc(image.src)}"`);
  a.push(`alt="${esc(image.alt ?? '')}"`);
  const m = image.src.match(/^(.*)-1440(\.\w+)$/);
  if (m && fileFor(`${m[1]}-720${m[2]}`)) {
    const big = dims(image.src);
    a.push(`srcset="${esc(`${m[1]}-720${m[2]}`)} 720w, ${esc(image.src)} ${big ? big.width : 1440}w"`);
    a.push(`sizes="${esc(opts.sizes || '(max-width: 760px) 100vw, 50vw')}"`);
  }
  if (opts.dims !== false) {
    const d = dims(image.src);
    if (d) a.push(`width="${d.width}" height="${d.height}"`);
  }
  if (opts.priority) a.push('fetchpriority="high"');
  else if (opts.lazy !== false) a.push('loading="lazy"');
  return `<img ${a.join(' ')}>`;
}

module.exports = function (eleventyConfig) {
  ['assets', 'admin', 'style.css', 'app.js', 'robots.txt', 'favicon.png', 'favicon.ico', 'apple-touch-icon.png'].forEach((p) => {
    if (fs.existsSync(path.join(ROOT, p))) eleventyConfig.addPassthroughCopy(p);
  });
  eleventyConfig.addWatchTarget('content/');

  eleventyConfig.addShortcode('image', imageTag);
  eleventyConfig.addFilter('md', (s) => (s ? md.render(String(s)) : ''));
  eleventyConfig.addFilter('mdi', (s) => (s ? md.renderInline(String(s)) : ''));
  eleventyConfig.addFilter('abs', (u, base) => (!u ? '' : /^https?:/.test(u) ? u : base + u));
  eleventyConfig.addFilter('nl2br', (s) => esc(s).split('\n').join('<br>'));
  eleventyConfig.addFilter('isExternal', (u) => /^https?:/.test(u || ''));

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
};
