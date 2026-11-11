"use strict";
/* ===== Shared helpers: text parsing, page parsing, maths ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rxe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = s => String(s || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u00a0/g, ' ');
const words = t => (t || '').match(/[A-Za-z0-9]+(?:['\-][A-Za-z0-9]+)*/g) || [];
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
const pct = (a, b) => b ? a / b * 100 : 0;
const uniq = a => [...new Set(a)];
const YEAR = new Date().getFullYear();

const STOP = new Set(('a an the and or but of to in on for with at by from is are was were be been being it this that as your you we our i my me how what why can do does did will would should could not no so if than then them they their its it\'s has have had into about more most also just all any some there these those which who whom when where very own same such only other each both few many much up out over under again further once here off too s t don\'t isn\'t aren\'t can\'t won\'t get got make made one two use used using via per vs etc may might must need let like well even still yet because while during before after above below between through within without against among across around upon onto toward towards via whether either neither nor every any anyone everyone someone something anything nothing new way ways thing things lot lots really actually us go oh am pm re ve ll www com http https').split(' '));

const ctx2d = document.createElement('canvas').getContext('2d');
function px(t, font) { ctx2d.font = font; return ctx2d.measureText(t || '').width; }
function fitPx(t, font, max) { if (px(t, font) <= max) return t; let s = t; while (s && px(s + ' ...', font) > max) s = s.slice(0, -1); return s.trim() + ' ...'; }

function sentences(p) {
  const s = p.replace(/\s+/g, ' ').replace(/(\d)\.(\d)/g, '$1\u2063$2').replace(/\b(e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|St|Inc|Ltd|approx|No)\./gi, x => x.replace(/\./g, '\u2063'));
  return (s.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || []).map(x => x.replace(/\u2063/g, '.').trim()).filter(x => /[A-Za-z0-9]/.test(x));
}
function syl(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1;
}
function stem(w) {
  w = w.toLowerCase();
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es') && /(ss|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}
const contentWords = t => words(t).map(w => w.toLowerCase()).filter(w => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
const stems = t => contentWords(t).map(stem);
function tf(list) { const m = new Map(); list.forEach(x => m.set(x, (m.get(x) || 0) + 1)); return m; }
function topN(map, n) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n); }
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  a.forEach((v, k) => { na += v * v; if (b.has(k)) dot += v * b.get(k); });
  b.forEach(v => { nb += v * v; });
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
function jaccard(a, b) { if (!a.size || !b.size) return 0; let i = 0; a.forEach(x => { if (b.has(x)) i++; }); return i / (a.size + b.size - i); }
function countPhrase(text, ph) {
  if (!ph) return 0;
  return (text.match(new RegExp('\\b' + rxe(ph).replace(/\s+/g, '\\s+') + '\\b', 'gi')) || []).length;
}
/* matches the phrase allowing simple plural/verb endings on each word */
function variantRegex(ph) {
  const parts = words(ph).map(w => rxe(stem(w)) + "[a-z']*");
  return parts.length ? new RegExp('\\b' + parts.join('[\\s-]+') + '\\b', 'gi') : null;
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; } }

/* ===== Article parsing ===== */
const stripMd = s => norm(s).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*|__|`/g, '').replace(/^>\s*/, '').trim();

function htmlToMd(html) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  d.querySelectorAll('script,style,noscript').forEach(e => e.remove());
  const out = [];
  const img = n => '![' + (n.getAttribute('alt') || '') + '](' + (n.getAttribute('src') || 'image') + ')';
  const inline = el => {
    let s = '';
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) s += n.nodeValue;
      else if (n.nodeType === 1) {
        const t = n.tagName;
        if (t === 'A' && n.getAttribute('href')) s += '[' + inline(n).trim() + '](' + n.getAttribute('href') + ')';
        else if (t === 'IMG') s += img(n);
        else if (t === 'BR') s += ' ';
        else s += inline(n);
      }
    });
    return s.replace(/\s+/g, ' ');
  };
  const walk = el => el.childNodes.forEach(n => {
    if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(n.nodeValue.trim()); return; }
    if (n.nodeType !== 1) return;
    const t = n.tagName;
    if (/^H[1-6]$/.test(t)) { const s = inline(n).trim(); if (s) out.push('#'.repeat(+t[1]) + ' ' + s); }
    else if (t === 'LI') { const s = inline(n).trim(); if (s) out.push((n.parentElement && n.parentElement.tagName === 'OL' ? '1. ' : '- ') + s); }
    else if (t === 'TR') { const cells = [...n.children].map(c => inline(c).trim()); if (cells.join('')) out.push('| ' + cells.join(' | ') + ' |'); }
    else if (['P', 'BLOCKQUOTE', 'FIGCAPTION', 'DT', 'DD'].includes(t)) { const s = inline(n).trim(); if (s) out.push(s); }
    else if (t === 'IMG') out.push(img(n));
    else walk(n);
  });
  walk(d.body);
  return out.join('\n\n').replace(/(\| [^\n]*\|)\n\n(?=\|)/g, '$1\n');
}

function parseMarkdown(raw) {
  raw = norm(raw);
  const blocks = [], links = [], images = [];
  let tables = 0, inTable = false, marked = false;
  raw.split(/\r?\n/).forEach(line => {
    const l = line.trim();
    if (!l) { inTable = false; return; }
    if (/^\|.*\|$/.test(l)) {
      if (/^\|[\s:\-|]+\|$/.test(l)) return;
      if (!inTable) { tables++; inTable = true; }
      blocks.push({ type: 'p', text: stripMd(l.replace(/\|/g, ' ').replace(/\s+/g, ' ')), table: true, links: 0 });
      return;
    }
    inTable = false;
    const lk = [...l.matchAll(/(^|[^!])\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)];
    [...l.matchAll(/!\[([^\]]*)\]\(([^)\s]*)[^)]*\)/g)].forEach(x => images.push({ src: x[2], alt: x[1].trim() || null, width: null, height: null, loading: '' }));
    const bi = blocks.length;
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.+)$/))) { marked = true; blocks.push({ type: 'h', level: m[1].length, text: stripMd(m[2]), links: lk.length }); }
    else if (/^!\[[^\]]*\]\([^)]*\)$/.test(l)) return;
    else if ((m = l.match(/^([-*+\u2022]|\d+[.)])\s+(.+)$/))) { const t = stripMd(m[2]); if (t) blocks.push({ type: 'p', text: t, list: true, ordered: /\d/.test(m[1]), links: lk.length }); }
    else { const t = stripMd(l); if (t) blocks.push({ type: 'p', text: t, links: lk.length }); }
    lk.forEach(x => links.push({ href: x[3], abs: x[3], text: stripMd(x[2]), rel: '', block: bi }));
  });
  let guessed = false;
  if (!marked) {
    blocks.forEach((b, i) => {
      if (b.list || b.table || i === blocks.length - 1) return;
      if (b.text.split(/\s+/).length <= 12 && !/[.!:;,]$/.test(b.text)) { b.type = 'h'; b.level = i === 0 ? 1 : 2; guessed = true; }
    });
  }
  return { blocks, links, images, tables, guessed };
}

function blocksFromDom(root, base) {
  const blocks = [], links = [], images = [];
  let tables = 0;
  const abs = h => { try { return new URL(h, base).href; } catch (e) { return h; } };
  const text = el => norm(el.textContent).replace(/\s+/g, ' ').trim();
  const addLinks = (el, bi) => el.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || /^(javascript:|mailto:|tel:|#)/i.test(href)) return;
    links.push({ href, abs: base ? abs(href) : href, text: text(a), rel: (a.getAttribute('rel') || '').toLowerCase(), block: bi });
  });
  const addImg = img => {
    const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
    if (!src || /^data:/.test(src)) return;
    images.push({ src: base ? abs(src) : src, alt: img.hasAttribute('alt') ? img.getAttribute('alt').trim() : null, width: img.getAttribute('width'), height: img.getAttribute('height'), loading: (img.getAttribute('loading') || '').toLowerCase() });
  };
  const push = (b, el) => { blocks.push(b); addLinks(el, blocks.length - 1); el.querySelectorAll('img').forEach(addImg); };
  const walk = el => {
    for (const n of el.children) {
      const t = n.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'FORM', 'BUTTON', 'IFRAME', 'SELECT', 'TEMPLATE'].includes(t)) continue;
      if (/^H[1-6]$/.test(t)) { const s = text(n); if (s) push({ type: 'h', level: +t[1], text: s, links: n.querySelectorAll('a[href]').length }, n); continue; }
      if (t === 'TABLE') { tables++; n.querySelectorAll('tr').forEach(tr => { const s = text(tr); if (s) push({ type: 'p', text: s, table: true, links: tr.querySelectorAll('a[href]').length }, tr); }); continue; }
      if (t === 'LI') { const s = text(n); if (s) push({ type: 'p', text: s, list: true, ordered: n.parentElement && n.parentElement.tagName === 'OL', links: n.querySelectorAll('a[href]').length }, n); continue; }
      if (['P', 'BLOCKQUOTE', 'FIGCAPTION', 'DD', 'DT', 'PRE'].includes(t)) { const s = text(n); if (s) push({ type: 'p', text: s, links: n.querySelectorAll('a[href]').length }, n); else n.querySelectorAll('img').forEach(addImg); continue; }
      if (t === 'IMG') { addImg(n); continue; }
      if (!n.children.length) { const s = text(n); if (s && s.split(' ').length > 3) blocks.push({ type: 'p', text: s, links: 0 }); continue; }
      walk(n);
    }
  };
  walk(root);
  return { blocks, links, images, tables };
}

function parsePage(html, url) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  const q = s => d.querySelector(s);
  const meta = n => { const e = q(`meta[name="${n}" i]`) || q(`meta[property="${n}" i]`); return e ? norm(e.getAttribute('content') || '').trim() : null; };
  const page = {
    title: norm(q('title') ? q('title').textContent : '').replace(/\s+/g, ' ').trim(),
    desc: meta('description'),
    canonical: q('link[rel~="canonical" i]') ? q('link[rel~="canonical" i]').getAttribute('href') : null,
    robots: ((meta('robots') || '') + ' ' + (meta('googlebot') || '')).toLowerCase(),
    viewport: meta('viewport'),
    lang: d.documentElement.getAttribute('lang'),
    author: meta('author'),
    published: meta('article:published_time') || meta('datePublished'),
    modified: meta('article:modified_time') || meta('og:updated_time'),
    og: { title: meta('og:title'), desc: meta('og:description'), image: meta('og:image') },
    schema: [], trust: { about: false, contact: false, privacy: false, terms: false }, mixed: [], authorEl: null, bio: null
  };
  d.querySelectorAll('script[type="application/ld+json" i]').forEach(s => {
    try { page.schema.push({ ok: true, data: JSON.parse(s.textContent) }); } catch (e) { page.schema.push({ ok: false, error: e.message }); }
  });
  d.querySelectorAll('a[href]').forEach(a => {
    const h = ((a.getAttribute('href') || '') + ' ' + a.textContent).toLowerCase();
    if (/about/.test(h)) page.trust.about = true;
    if (/contact/.test(h)) page.trust.contact = true;
    if (/privacy/.test(h)) page.trust.privacy = true;
    if (/terms|editorial/.test(h)) page.trust.terms = true;
  });
  if (/^https:/i.test(url)) d.querySelectorAll('img[src],script[src],iframe[src],link[rel="stylesheet"][href],source[src],video[src],audio[src]').forEach(e => {
    const v = e.getAttribute('src') || e.getAttribute('href'); if (/^http:\/\//i.test(v)) page.mixed.push(v);
  });
  const au = q('[rel~="author"], [itemprop="author"], .author-name, .byline, .entry-author, .post-author, .author');
  if (au) page.authorEl = norm(au.textContent).replace(/\s+/g, ' ').trim().slice(0, 80);
  const bio = q('.author-bio, .about-author, .author-box, .author-description, #author-bio, .saboxplugin-wrap, [class*="author-bio"], [class*="author-box"]');
  if (bio) page.bio = norm(bio.textContent).replace(/\s+/g, ' ').trim();
  if (!page.bio) {
    const hh = [...d.querySelectorAll('h2,h3,h4')].find(x => /about the author|author bio|written by/i.test(x.textContent));
    if (hh) { let t = '', n = hh.nextElementSibling; for (let i = 0; n && i < 3; i++, n = n.nextElementSibling) t += ' ' + n.textContent; page.bio = norm(t).replace(/\s+/g, ' ').trim(); }
  }
  page.docH1 = [...d.querySelectorAll('h1')].map(h => norm(h.textContent).replace(/\s+/g, ' ').trim()).filter(Boolean);
  const main = q('article .entry-content') || q('.entry-content') || q('.post-content') || q('article') || q('main') || q('[role="main"]') || q('#content') || d.body;
  const c = main.cloneNode(true);
  c.querySelectorAll('nav, header, footer, aside, script, style, noscript, form, iframe, .sidebar, .widget, .comments, #comments, .related, .share, .social, .breadcrumb, .breadcrumbs, .author-bio, .about-author, .author-box, [class*="author-box"], .toc, #toc, .ez-toc-container').forEach(e => e.remove());
  Object.assign(page, blocksFromDom(c, url));
  if (!page.blocks.some(b => b.type === 'h' && b.level === 1) && page.docH1.length) page.blocks.unshift({ type: 'h', level: 1, text: page.docH1[0], links: 0 });
  page.guessed = false;
  return page;
}

/* Parse pasted content: markdown/plain text, an HTML fragment, or a full HTML page */
function parseArticle(raw, base) {
  if (/<html[\s>]|<head[\s>]/i.test(raw)) return Object.assign({ fullPage: true }, parsePage(raw, base || 'https://example.com/'));
  if (/<\/?(p|h[1-6]|div|a|img|ul|ol|li|br|table)\b/i.test(raw)) return parseMarkdown(htmlToMd(raw));
  return parseMarkdown(raw);
}
