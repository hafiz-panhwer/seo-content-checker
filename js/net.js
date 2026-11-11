"use strict";
/* ===== Network: page reader, robots/sitemap, link status, grammar, PageSpeed ===== */
const NET = { jinaKey: '', psiKey: '', next: 0 };

async function gate() {
  const gap = NET.jinaKey ? 250 : 3200;
  const slot = Math.max(Date.now(), NET.next);
  NET.next = slot + gap;
  const wait = slot - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}

/* Reads a URL through r.jina.ai (CORS-enabled). Returns {content,status,finalUrl,warning,title}. */
async function readUrl(url, format = 'html', timeout = 45000) {
  await gate();
  const headers = { 'Accept': 'application/json', 'X-Return-Format': format };
  if (NET.jinaKey) headers['Authorization'] = 'Bearer ' + NET.jinaKey;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch('https://r.jina.ai/' + url, { headers, signal: ctl.signal });
    if (r.status === 429) throw new Error('The free page reader hit its rate limit. Wait a minute, or add a free Jina key in Settings.');
    if (r.status === 401 || r.status === 402) throw new Error('The Jina key was rejected. Remove it in Settings to use the free tier.');
    if (!r.ok) throw new Error('Page reader returned error ' + r.status + '.');
    const j = await r.json();
    const d = j.data || {};
    let status = d.httpStatus || null;
    if (!status && d.warning) { const m = String(d.warning).match(/\b([1-5]\d\d)\b/); if (m) status = +m[1]; }
    return { content: d.html || d.content || d.text || '', status: status || 200, finalUrl: d.finalUrl || d.url || url, warning: d.warning || '', title: d.title || '' };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The page took too long to load (over ' + Math.round(timeout / 1000) + ' seconds).');
    if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) throw new Error('Could not reach the page reader. Check your internet connection.');
    throw e;
  } finally { clearTimeout(t); }
}

/* robots.txt: returns {found, text, blocked, rule, sitemaps[]} for the page path */
async function checkRobots(pageUrl) {
  const u = new URL(pageUrl);
  const res = await readUrl(u.origin + '/robots.txt', 'text', 30000);
  if (res.status >= 400 || !/user-agent|disallow|allow|sitemap/i.test(res.content)) return { found: false, sitemaps: [] };
  const lines = res.content.split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean);
  const groups = []; let cur = null, lastWasAgent = false;
  const sitemaps = [];
  lines.forEach(l => {
    const m = l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) return;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'sitemap') { sitemaps.push(v); return; }
    if (k === 'user-agent') { if (!lastWasAgent || !cur) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasAgent = true; return; }
    lastWasAgent = false;
    if (cur && (k === 'allow' || k === 'disallow')) cur.rules.push({ allow: k === 'allow', path: v });
  });
  const pick = groups.find(g => g.agents.some(a => a.includes('googlebot'))) || groups.find(g => g.agents.includes('*'));
  const path = u.pathname + u.search;
  let best = null;
  if (pick) pick.rules.forEach(r => {
    if (!r.path) return;
    const re = new RegExp('^' + r.path.split('*').map(rxe).join('.*').replace(/\\\$$/, '$'));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  });
  return { found: true, blocked: !!(best && !best.allow), rule: best ? (best.allow ? 'Allow: ' : 'Disallow: ') + best.path : null, sitemaps };
}

/* Sitemap: loads index + up to 3 child sitemaps. Returns {found, urls[], source, partial} */
async function loadSitemap(pageUrl, robotSitemaps, onStep) {
  const origin = new URL(pageUrl).origin;
  const candidates = uniq([...(robotSitemaps || []), origin + '/sitemap_index.xml', origin + '/sitemap.xml']);
  const locs = x => [...x.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map(m => m[1].replace(/&amp;/g, '&'));
  for (const sm of candidates.slice(0, 3)) {
    let res;
    try { res = await readUrl(sm, 'html', 30000); } catch (e) { continue; }
    if (res.status >= 400 || !/<loc>/i.test(res.content)) continue;
    if (/<sitemapindex/i.test(res.content)) {
      const children = locs(res.content);
      const ranked = children.slice().sort((a, b) => (/post|page|blog|article/i.test(b) ? 1 : 0) - (/post|page|blog|article/i.test(a) ? 1 : 0));
      const urls = [];
      for (const ch of ranked.slice(0, 3)) {
        if (onStep) onStep('Reading sitemap ' + ch.split('/').pop());
        try { const r = await readUrl(ch, 'html', 30000); urls.push(...locs(r.content)); } catch (e) { /* skip this child */ }
      }
      return { found: true, urls: uniq(urls), source: sm, partial: children.length > 3, childCount: children.length };
    }
    return { found: true, urls: uniq(locs(res.content)), source: sm, partial: false };
  }
  return { found: false, urls: [] };
}

/* Link status via the reader. 401/403/429 often mean "blocks bots", not broken. */
async function checkLinkList(list, onProgress) {
  const out = new Map();
  for (let i = 0; i < list.length; i++) {
    if (onProgress) onProgress(i + 1, list.length);
    try { const r = await readUrl(list[i], 'text', 25000); out.set(list[i], { status: r.status, finalUrl: r.finalUrl }); }
    catch (e) { out.set(list[i], { status: 0, error: e.message }); if (/rate limit/i.test(e.message)) break; }
  }
  return out;
}

/* LanguageTool public API (CORS-enabled, free: 20 requests/min, 20KB each) */
async function grammarCheck(blocks) {
  const parts = blocks.map(b => b.text), chunks = [];
  let cur = '';
  parts.forEach(p => { if (cur && cur.length + p.length > 15000) { chunks.push(cur); cur = ''; } cur += (cur ? '\n\n' : '') + p; });
  if (cur) chunks.push(cur);
  const matches = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i) await new Promise(r => setTimeout(r, 3500));
    const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ text: chunks[i], language: 'en-US' }) });
    if (r.status === 429) throw new Error('LanguageTool free limit reached. Wait one minute and run again.');
    if (!r.ok) throw new Error('LanguageTool returned error ' + r.status + '.');
    matches.push(...(await r.json()).matches);
  }
  return matches;
}

/* Google PageSpeed Insights v5 (mobile) */
async function pageSpeed(url) {
  const cats = ['performance', 'seo', 'best-practices', 'accessibility'].map(c => '&category=' + c).join('');
  const key = NET.psiKey ? '&key=' + encodeURIComponent(NET.psiKey) : '';
  const r = await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&url=' + encodeURIComponent(url) + cats + key);
  if (r.status === 429) throw new Error('needs-key');
  if (r.status === 400) { const j = await r.json().catch(() => ({})); throw new Error((j.error && j.error.message) || 'PageSpeed could not test this URL.'); }
  if (!r.ok) throw new Error('PageSpeed returned error ' + r.status + '.');
  const j = await r.json();
  const lr = j.lighthouseResult || {}, au = lr.audits || {}, cat = lr.categories || {};
  const fm = (j.loadingExperience && j.loadingExperience.metrics) || {};
  const sc = k => au[k] && au[k].score != null ? au[k].score : null;
  const nv = k => au[k] ? au[k].numericValue : null;
  return {
    perf: cat.performance ? Math.round(cat.performance.score * 100) : null,
    seo: cat.seo ? Math.round(cat.seo.score * 100) : null,
    lab: { lcp: nv('largest-contentful-paint'), cls: nv('cumulative-layout-shift'), tbt: nv('total-blocking-time'), fcp: nv('first-contentful-paint') },
    field: Object.keys(fm).length ? {
      lcp: fm.LARGEST_CONTENTFUL_PAINT_MS && fm.LARGEST_CONTENTFUL_PAINT_MS.percentile,
      inp: fm.INTERACTION_TO_NEXT_PAINT && fm.INTERACTION_TO_NEXT_PAINT.percentile,
      cls: fm.CUMULATIVE_LAYOUT_SHIFT_SCORE && fm.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
    } : null,
    viewport: sc('viewport'), fontSize: sc('font-size'), https: sc('is-on-https'),
    images: { optimized: sc('uses-optimized-images'), modern: sc('modern-image-formats'), responsive: sc('uses-responsive-images'), offscreen: sc('offscreen-images'), sized: sc('unsized-images') }
  };
}
