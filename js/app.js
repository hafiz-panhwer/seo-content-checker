"use strict";
/* ===== UI: inputs, pipeline, dashboard, before/after, print ===== */
const FIELDS = ['url', 'kw', 'kw2', 'target', 'title', 'desc', 'slug', 'domain', 'content', 'comps', 'others', 'psiKey', 'jinaKey'];
const OPTS = ['optGrammar', 'optLinks', 'optPsi'];
const STORE = 'parix-audit-v2';
let MODE = 'text', VIEW = 'dashboard', LAST = null, PREV = null, FILTER = 'crit';

function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(STORE + k) || 'null'); localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) { return null; } }
function save() { const v = { mode: MODE }; FIELDS.forEach(f => v[f] = $(f).value); OPTS.forEach(o => v[o] = $(o).checked); store(':inputs', v); }
function load() { const v = store(':inputs'); if (!v) return; FIELDS.forEach(f => { if (v[f] != null) $(f).value = v[f]; }); OPTS.forEach(o => { if (v[o] != null) $(o).checked = v[o]; }); setMode(v.mode || 'text'); }

function setMode(m) {
  MODE = m;
  $('modeText').setAttribute('aria-pressed', m === 'text'); $('modeUrl').setAttribute('aria-pressed', m === 'url');
  $('urlField').hidden = m !== 'url'; $('textFields').hidden = m === 'url';
}
function counters() {
  const t = $('title').value, d = $('desc').value;
  $('titleCount').textContent = `${t.length} chars · ${Math.round(px(t, '20px Arial'))} / 600 px`;
  $('descCount').textContent = `${d.length} chars · ${Math.round(px(d, '14px Arial'))} / 920 px`;
  $('contentCount').textContent = words($('content').value).length + ' words';
  $('serpLink').href = 'https://www.google.com/search?q=' + encodeURIComponent($('kw').value || '');
}

/* ----- progress ----- */
const steps = [];
function step(label) { const s = { label, state: 'run' }; steps.push(s); drawSteps(); return { done: (t) => { s.state = 'done'; if (t) s.label = t; drawSteps(); }, fail: (t) => { s.state = 'err'; s.label = t; drawSteps(); }, set: (t) => { s.label = t; drawSteps(); } }; }
function drawSteps() { $('progress').innerHTML = steps.map(s => `<div class="${s.state}">${s.state === 'done' ? '✓' : s.state === 'err' ? '✗' : '…'} ${esc(s.label)}</div>`).join(''); }

/* ----- the pipeline ----- */
async function run() {
  save();
  NET.jinaKey = $('jinaKey').value.trim(); NET.psiKey = $('psiKey').value.trim();
  steps.length = 0; drawSteps();
  const btn = $('runBtn'); btn.disabled = true; btn.textContent = 'Auditing…';
  try {
    const A = { mode: MODE, kw: $('kw').value, kw2: $('kw2').value.split(',').map(s => s.trim()).filter(Boolean), target: Math.max(100, +$('target').value || 1200), others: $('others').value.split(/\n/).map(s => s.trim()).filter(Boolean) };
    if (MODE === 'url') {
      let u = $('url').value.trim(); if (!u) throw new Error('Enter the page URL.');
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      try { new URL(u); } catch (e) { throw new Error('That URL is not valid. Example: https://example.com/blog/post/'); }
      A.url = u; A.live = true;
      const s1 = step('Fetching the page');
      const pg = await readUrl(u, 'html', 60000);
      A.httpStatus = pg.status; A.finalUrl = pg.finalUrl;
      if (!pg.content || pg.content.length < 200) throw new Error('The page came back empty. It may block automated readers.');
      A.page = parsePage(pg.content, pg.finalUrl || u); A.doc = A.page;
      s1.done(`Page fetched (HTTP ${pg.status}, ${words(A.page.blocks.map(b => b.text).join(' ')).length} words of content)`);
      A.title = A.page.title; A.desc = A.page.desc || '';
      const s2 = step('Reading robots.txt');
      try { A.robots = await checkRobots(A.finalUrl || u); s2.done(A.robots.found ? 'robots.txt read' : 'No robots.txt found'); } catch (e) { A.robotsErr = e.message; s2.fail('robots.txt: ' + e.message); }
      const s3 = step('Reading sitemap');
      try { A.sitemap = await loadSitemap(A.finalUrl || u, A.robots && A.robots.sitemaps, t => s3.set(t)); s3.done(A.sitemap.found ? `Sitemap read (${A.sitemap.urls.length} URLs)` : 'No sitemap found'); } catch (e) { s3.fail('Sitemap: ' + e.message); }
      if ($('optPsi').checked) {
        const s4 = step('Running Google PageSpeed (mobile, up to 60s)');
        try { A.psi = await pageSpeed(A.finalUrl || u); s4.done(`PageSpeed done (performance ${A.psi.perf})`); } catch (e) { A.psiErr = e.message; s4.fail(e.message === 'needs-key' ? 'PageSpeed needs a free API key (Settings)' : 'PageSpeed: ' + e.message); }
      } else A.psiErr = 'turned off in Settings.';
    } else {
      const raw = $('content').value; if (!raw.trim()) throw new Error('Paste your article first.');
      A.raw = raw;
      const dom = $('domain').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const slug = $('slug').value.trim().replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '');
      if (slug) A.url = 'https://' + (dom || 'example.com') + '/' + slug + '/';
      A.doc = parseArticle(raw, A.url || (dom ? 'https://' + dom + '/' : 'https://example.com/'));
      if (A.doc.fullPage) { A.page = A.doc; A.title = $('title').value.trim() || A.page.title; A.desc = $('desc').value.trim() || A.page.desc || ''; }
      else { A.title = $('title').value.trim(); A.desc = $('desc').value.trim(); }
      A.guessed = A.doc.guessed;
      A.title = norm(A.title); A.desc = norm(A.desc);
      if (dom) A.hostIn = dom.replace(/^www\./, '').toLowerCase();
    }
    // URL parts
    const urlForParts = A.finalUrl || A.url;
    if (urlForParts) { try { const x = new URL(urlForParts); A.host = x.hostname.replace(/^www\./, '').toLowerCase(); A.path = x.pathname; A.query = x.search; } catch (e) { /* ignore */ } }
    if (A.mode === 'text' && A.hostIn) A.host = A.hostIn;
    if (A.mode === 'text' && !$('slug').value.trim()) A.host = A.hostIn || '';
    const lastSeg = (A.path || '').split('/').filter(Boolean).pop() || '';
    A.slug = lastSeg; A.slugWords = lastSeg ? lastSeg.toLowerCase().replace(/\.[a-z]+$/, '').split(/[-_]+/).filter(Boolean) : [];
    if (A.url) A.urlNorm = normUrl(A.finalUrl || A.url);
    if (A.page && A.page.canonical) { try { A.canonNorm = normUrl(new URL(A.page.canonical, A.finalUrl || A.url || 'https://example.com/').href); } catch (e) { /* ignore */ } }
    // competitors
    const compUrls = uniq($('comps').value.split(/\s+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s))).slice(0, 5);
    A.compsRaw = [];
    for (let i = 0; i < compUrls.length; i++) {
      const s = step(`Reading competitor ${i + 1} of ${compUrls.length}: ${hostOf(compUrls[i])}`);
      try { const r = await readUrl(compUrls[i], 'html', 60000); const doc = parsePage(r.content, r.finalUrl || compUrls[i]); A.compsRaw.push({ url: compUrls[i], doc, status: r.status }); s.done(`Competitor ${i + 1}: ${hostOf(compUrls[i])} (${words(doc.blocks.map(b => b.text).join(' ')).length} words)`); }
      catch (e) { A.compsRaw.push({ url: compUrls[i], err: e.message }); s.fail(`Competitor ${i + 1} failed: ${e.message}`); }
    }
    const s5 = step('Analysing content');
    prepare(A); s5.done('Content analysed');
    // links
    if ($('optLinks').checked) {
      const list = uniq(A.links.map(l => l.abs).filter(h => /^https?:\/\//i.test(h))).slice(0, 12);
      if (list.length) { const s6 = step(`Checking ${list.length} links`); A.linkStatus = await checkLinkList(list, (i, n) => s6.set(`Checking link ${i} of ${n}`)); s6.done(`${list.length} links checked`); }
      else A.linkStatus = new Map();
    }
    // grammar
    if ($('optGrammar').checked) {
      const s7 = step('Checking grammar with LanguageTool');
      try { A.lt = { matches: await grammarCheck(A.doc.blocks) }; s7.done(`Grammar checked (${A.lt.matches.length} suggestions)`); }
      catch (e) { A.lt = { error: /fetch/i.test(e.message) ? 'could not connect.' : e.message }; s7.fail('LanguageTool: ' + A.lt.error); }
    }
    const s8 = step('Scoring 100 checks');
    const out = runAudit(A); s8.done('Audit complete');
    PREV = store(':last'); LAST = { A, ...out, at: Date.now() };
    store(':last', snapshot(LAST));
    VIEW = 'dashboard'; render();
    $('report').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    step('').fail(e.message);
  } finally { btn.disabled = false; btn.textContent = 'Run full audit'; }
}
function snapshot(L) { const st = {}; Object.keys(L.res).forEach(k => st[k] = L.res[k].s); const cats = {}; Object.keys(L.cats).forEach(k => cats[k] = L.cats[k].score); return { at: L.at, total: L.total, cats, st, label: L.A.url || cut(L.A.title || L.A.kw || 'Pasted article', 60) }; }

/* ----- rendering ----- */
const STATUS_TXT = { pass: 'Pass', warn: 'Warning', fail: 'Fail', na: 'Not available' };
const pill = s => `<span class="pill ${s}">${STATUS_TXT[s]}</span>`;
const scoreColor = s => s == null ? 'var(--na)' : s >= 80 ? 'var(--pass)' : s >= 55 ? 'var(--warn)' : 'var(--fail)';
function verdict(t) { return t >= 90 ? ['Excellent', 'Ready to publish. Review the remaining warnings.'] : t >= 75 ? ['Good', 'Good foundation. Fix the critical issues and warnings before publishing.'] : t >= 55 ? ['Needs work', 'Several important problems. Start with the critical issues.'] : ['Poor', 'Major problems in several areas. Work through the critical issues first.']; }
function priority(c, r) { if (r.s === 'fail' && c.crit) return 'crit'; if (r.s === 'fail' || (r.s === 'warn' && c.crit)) return 'warn'; if (r.s === 'warn') return 'opt'; return null; }

function issueHtml(c, r, cls) {
  return `<div class="issue ${cls === 'crit' ? 'fail' : cls === 'warn' ? 'warn' : 'opt'}"><div class="h"><span class="id">#${c.id}</span><b>${esc(c.name)}</b>${pill(r.s)}<span class="meth">${METHOD[c.m]}</span></div>
  <div class="d"><b>${esc(r.v)}</b>${r.d ? ' · ' + r.d : ''}</div>${locHtml(r.loc)}${fixHtml(c)}</div>`;
}
const locHtml = loc => loc && loc.length ? `<ul class="loc">${loc.slice(0, 12).map(l => `<li>${esc(l)}</li>`).join('')}${loc.length > 12 ? `<li>…and ${loc.length - 12} more</li>` : ''}</ul>` : '';
const fixHtml = c => `<div class="fix"><b>How to fix:</b> ${esc(c.fix)}${c.ex ? `<span class="ex">Example: ${esc(c.ex)}</span>` : ''}</div>`;

function render() {
  document.querySelectorAll('#views button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === VIEW));
  if (!LAST) return;
  const o = $('out');
  o.innerHTML = `<div class="view" id="view-dashboard"${VIEW === 'dashboard' ? '' : ' hidden'}>${dashboard()}</div>
  <div class="view" id="view-checks"${VIEW === 'checks' ? '' : ' hidden'}><div class="printonly"><h2 style="margin:24px 0 10px">All 100 checks</h2></div>${allChecks()}</div>
  <div class="view" id="view-highlights"${VIEW === 'highlights' ? '' : ' hidden'}>${highlights()}</div>
  <div class="view" id="view-competitors"${VIEW === 'competitors' ? '' : ' hidden'}>${competitors()}</div>`;
}

function dashboard() {
  const { A, res, cats, total } = LAST;
  const [vt, vn] = verdict(total);
  const all = CHECKS.map(c => res[c.id]);
  const cnt = s => all.filter(r => r.s === s).length;
  const methodCnt = m => CHECKS.filter(c => res[c.id].s !== 'na' && c.m === m).length;
  const C = 2 * Math.PI * 64, off = C * (1 - total / 100);
  const pri = { crit: [], warn: [], opt: [] };
  CHECKS.forEach(c => { const p = priority(c, res[c.id]); if (p) pri[p].push(c); });
  const list = pri[FILTER];
  const url = A.url ? (A.finalUrl || A.url).replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\//g, ' › ') : (A.host || 'example.com');
  let ba = '';
  if (PREV && PREV.st) {
    const d = total - PREV.total;
    const resolved = CHECKS.filter(c => PREV.st[c.id] && PREV.st[c.id] !== 'pass' && PREV.st[c.id] !== 'na' && res[c.id].s === 'pass');
    const fresh = CHECKS.filter(c => PREV.st[c.id] === 'pass' && (res[c.id].s === 'warn' || res[c.id].s === 'fail'));
    ba = `<section class="sec"><h2>Before → after <button class="btn ghost small noprint" type="button" id="resetBA">Reset comparison</button></h2>
      <p class="note">Compared with your previous audit (${esc(PREV.label)}, ${new Date(PREV.at).toLocaleString()}).</p>
      <div class="ba"><div>Overall<br><b>${PREV.total} → ${total}</b> <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${d}</span></div>
      ${CATS.map(c => { const a = PREV.cats[c.id], b = cats[c.id].score; if (a == null && b == null) return ''; const dd = (b || 0) - (a || 0); return `<div>${esc(c.name)}<br><b>${a == null ? '–' : a} → ${b == null ? '–' : b}</b> ${a != null && b != null ? `<span class="${dd >= 0 ? 'up' : 'down'}">${dd >= 0 ? '+' : ''}${dd}</span>` : ''}</div>`; }).join('')}</div>
      ${resolved.length ? `<p class="d"><b class="up">Resolved (${resolved.length}):</b> ${resolved.map(c => '#' + c.id + ' ' + esc(c.name)).join(', ')}</p>` : ''}
      ${fresh.length ? `<p class="d"><b class="down">New issues (${fresh.length}):</b> ${fresh.map(c => '#' + c.id + ' ' + esc(c.name)).join(', ')}</p>` : ''}</section>`;
  }
  const cand = uniq(A.S.filter(s => s.w >= 12).map(s => s.t)).map(t => ({ t, sc: contentWords(t).length })).sort((a, b) => b.sc - a.sc).slice(0, 8).map(x => x.t.replace(/["“”]/g, '').split(/\s+/).slice(0, 28).join(' ').replace(/[.!?]+$/, ''));
  return `<div class="printonly"><h1>SEO audit report</h1><p>${esc(A.url || A.title || 'Pasted article')} · ${new Date(LAST.at).toLocaleString()}${A.kwl ? ' · Keyword: ' + esc(A.kwl) : ''}</p></div>
  <section class="hero">
    <div class="ring" role="img" aria-label="Overall score ${total} out of 100"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" fill="none" stroke="var(--surface-2)" stroke-width="12"/><circle cx="75" cy="75" r="64" fill="none" stroke="${scoreColor(total)}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg><div class="num"><b>${total}</b><span>of 100</span></div></div>
    <div><div class="verdict" style="color:${scoreColor(total)}">${vt}</div><p class="note">${vn}</p>
      <div class="chips"><span class="chip"><b>${cnt('pass')}</b> pass</span><span class="chip"><b>${cnt('warn')}</b> warnings</span><span class="chip"><b>${cnt('fail')}</b> fail</span><span class="chip"><b>${cnt('na')}</b> not available</span></div>
      <div class="chips"><span class="chip"><b>${methodCnt('M')}</b> measured</span><span class="chip"><b>${methodCnt('E')}</b> estimates</span><span class="chip">${A.N} words · ${A.mode === 'url' ? 'live URL' : 'pasted text'}${A.comps.length ? ` · ${A.comps.length} competitors` : ''}</span></div>
      <div class="actions noprint" style="margin-top:12px"><button class="btn small" type="button" id="pdfBtn">Download PDF report</button></div>
    </div>
  </section>
  <div class="cats">${CATS.map(c => { const k = cats[c.id]; return `<button type="button" class="cat" data-cat="${c.id}"><div class="t"><span>${esc(c.name)}</span><b style="color:${scoreColor(k.score)}">${k.score == null ? '–' : k.score}</b></div><div class="meter"><i style="width:${k.score || 0}%;background:${scoreColor(k.score)}"></i></div><div class="c">${k.counts.pass} pass · ${k.counts.warn} warn · ${k.counts.fail} fail${k.counts.na ? ` · ${k.counts.na} n/a` : ''}</div></button>`; }).join('')}</div>
  ${ba}
  <section class="sec"><h2>What to fix</h2>
    <div class="filters noprint">${[['crit', 'Critical', pri.crit.length], ['warn', 'Warnings', pri.warn.length], ['opt', 'Optional', pri.opt.length]].map(([k, l, n]) => `<button type="button" data-f="${k}" aria-pressed="${FILTER === k}">${l} (${n})</button>`).join('')}</div>
    <div class="screenonly">${list.length ? list.map(c => issueHtml(c, res[c.id], FILTER)).join('') : `<p class="note">Nothing in this group.</p>`}</div>
    <div class="printonly">${['crit', 'warn', 'opt'].map(k => pri[k].length ? `<h3 style="margin:14px 0 6px">${{ crit: 'Critical', warn: 'Warnings', opt: 'Optional' }[k]}</h3>` + pri[k].map(c => issueHtml(c, res[c.id], k)).join('') : '').join('')}</div>
  </section>
  <section class="sec"><h2>Google preview</h2><div class="serp"><div class="u">${esc(url)}</div><div class="ti">${esc(fitPx(A.title || '(no title)', '20px Arial', 600))}</div><div class="de">${esc(fitPx(A.desc || '(no meta description: Google will choose text from the page)', '14px Arial', 920))}</div></div></section>
  <section class="sec noprint"><h2>Free web plagiarism check</h2><p class="note">Each link searches Google for one of your sentences word for word. If another site shows the same sentence, rewrite it or cite it.</p>
    <div class="stack" style="margin-top:8px">${cand.map((t, i) => `<a href="https://www.google.com/search?q=${encodeURIComponent('"' + t + '"')}" target="_blank" rel="noopener">${i + 1}. "${esc(cut(t, 120))}"</a>`).join('') || '<span class="note">The article is too short to pick test sentences.</span>'}</div></section>
  <div class="disclaimer">How the score works: each category averages its checks (Pass 1, Warning 0.5, Fail 0) and categories are weighted (shown on the All 100 checks tab). Each critical failure subtracts 4 points${LAST.critFails ? ` (here: ${LAST.critFails} critical, −${LAST.critFails * 4})` : ''}. This score is a custom audit, not Google's ranking algorithm, and a high score cannot guarantee rankings. Thresholds are practical guidelines. "Estimate" checks use heuristics and are labelled. "Not available" checks need data this free tool cannot access, and they are left out of the score rather than guessed.</div>`;
}

function allChecks() {
  const { res, cats } = LAST;
  return CATS.map(cat => `<div class="group" id="grp-${cat.id}"><h3>${esc(cat.name)} <span>${cats[cat.id].score == null ? 'not scored' : cats[cat.id].score + '/100'} · weight ${cat.w}%</span></h3>
    ${CHECKS.filter(c => c.cat === cat.id).map(c => { const r = res[c.id]; return `<details class="row"${r.s === 'fail' && c.crit ? ' open' : ''}><summary><span class="n">${c.id}</span><span class="nm">${esc(c.name)}<small>${esc(r.v)}</small></span><span class="meth">${METHOD[c.m]}</span>${pill(r.s)}</summary>
      <div class="body"><div class="d">${r.d || ''}</div>${locHtml(r.loc)}${r.s !== 'pass' ? fixHtml(c) : ''}</div></details>`; }).join('')}</div>`).join('');
}

function highlights() {
  const A = LAST.A;
  const terms = [A.kwl, ...A.kw2l].filter(Boolean);
  const flags = [...A.wordy.map(w => w.p), ...A.spin];
  const all = [...terms, ...flags].sort((a, b) => b.length - a.length);
  const re = all.length ? new RegExp('\\b(' + all.map(t => rxe(esc(t)).replace(/\s+/g, '\\s+')).join('|') + ')\\b', 'gi') : null;
  const mark = s => re ? s.replace(re, m => `<mark class="${terms.includes(m.toLowerCase().replace(/\s+/g, ' ')) ? 'kw' : 'fl'}">${m}</mark>`) : s;
  const sentHtml = s => { const w = words(s).length, c = [w > 25 ? 'long' : '', PASSIVE.test(s) ? 'pass-v' : '', SUPER_RE.test(s) ? 'pass-v' : ''].filter(Boolean).join(' '); const t = mark(esc(s)); return c ? `<span class="${c}" title="${w > 25 ? w + ' words' : ''}">${t}</span>` : t; };
  return `<div class="legend"><span><mark class="kw">keyword</mark></span><span><mark class="fl">wordy or spun phrase</mark></span><span class="long">long sentence (25+ words)</span><span class="pass-v">passive voice or unsupported claim</span></div>
  <div class="article">${A.doc.blocks.map((b, i) => b.type === 'h' ? `<div class="hd">H${b.level} · ${mark(esc(b.text))}</div>` : `<p><span class="hint">¶${b.pi + 1}</span> ${b.list ? '• ' : ''}${sentences(b.text).map(sentHtml).join(' ')}</p>`).join('')}</div>`;
}

function competitors() {
  const A = LAST.A, failed = (A.compsRaw || []).filter(c => c.err);
  if (!A.comps.length) return `<div class="empty"><h2>No competitor pages yet</h2><p>Open <b>Compare against competitors</b>, paste up to 5 top-ranking URLs for your keyword, and run the audit again. This unlocks plagiarism similarity, paraphrasing, semantic keywords, content gaps and the comparison table.</p>${failed.map(c => `<p class="d">Could not read ${esc(c.url)}: ${esc(c.err)}</p>`).join('')}</div>`;
  const L = { words: 'Words', h2: 'H2 sections', images: 'Images', lists: 'List items', tables: 'Tables', ext: 'External links', numbers: 'Numbers', questions: 'Question headings' };
  return `<div class="tablewrap"><table><thead><tr><th>Metric</th><th>You</th>${A.comps.map(c => `<th>${esc(c.host)}</th>`).join('')}<th>Median</th></tr></thead><tbody>
    ${Object.keys(L).map(k => `<tr><td>${L[k]}</td><td><b style="color:${A.myStats[k] >= A.median[k] * 0.8 ? 'var(--pass)' : 'var(--fail)'}">${A.myStats[k]}</b></td>${A.comps.map(c => `<td>${c.stats[k]}</td>`).join('')}<td>${Math.round(A.median[k])}</td></tr>`).join('')}
    <tr><td>Text overlap with you</td><td>–</td>${A.comps.map(c => `<td>${c.sim.toFixed(1)}%</td>`).join('')}<td></td></tr></tbody></table></div>
  <section class="sec"><h2>Subtopics they cover that you don't (${A.missingTopics.length})</h2>${A.missingTopics.length ? `<ul class="loc">${A.missingTopics.slice(0, 25).map(t => `<li>${esc(t.text)} <span class="hint">· ${esc(t.host)}</span></li>`).join('')}</ul>` : '<p class="note">None. You cover every subtopic found.</p>'}</section>
  <section class="sec"><h2>Terms they share that you don't use (${A.semMissing.length})</h2><p>${A.semMissing.map(esc).join(', ') || '<span class="note">None.</span>'}</p></section>
  <section class="sec"><h2>Questions they answer (${(A.compQuestions || []).length})</h2>${(A.compQuestions || []).length ? `<ul class="loc">${A.compQuestions.map(q => `<li>${esc(q.text)} <span class="hint">· ${esc(q.host)}</span></li>`).join('')}</ul>` : '<p class="note">No unanswered competitor questions.</p>'}</section>
  ${A.missingEntities.length ? `<section class="sec"><h2>Names they mention that you don't</h2><p>${A.missingEntities.map(esc).join(', ')}</p></section>` : ''}
  ${failed.length ? `<section class="sec"><h2>Pages that could not be read</h2>${failed.map(c => `<p class="d">${esc(c.url)}: ${esc(c.err)}</p>`).join('')}</section>` : ''}`;
}

/* ----- events ----- */
$('modeText').onclick = () => { setMode('text'); save(); };
$('modeUrl').onclick = () => { setMode('url'); save(); };
$('runBtn').onclick = run;
$('views').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) { VIEW = b.dataset.v; render(); } });
$('out').addEventListener('click', e => {
  const f = e.target.closest('button[data-f]'); if (f) { FILTER = f.dataset.f; render(); return; }
  const c = e.target.closest('button[data-cat]'); if (c) { VIEW = 'checks'; render(); const g = $('grp-' + c.dataset.cat); if (g) g.scrollIntoView({ behavior: 'smooth' }); return; }
  if (e.target.id === 'pdfBtn') { printReport(); return; }
  if (e.target.id === 'resetBA') { PREV = null; store(':last', snapshot(LAST)); render(); }
});
let clearArm = 0;
$('clearBtn').onclick = () => {
  const b = $('clearBtn');
  if (Date.now() - clearArm < 4000) { ['url', 'kw', 'kw2', 'title', 'desc', 'slug', 'content', 'comps', 'others'].forEach(f => $(f).value = ''); clearArm = 0; b.textContent = 'Clear'; counters(); save(); }
  else { clearArm = Date.now(); b.textContent = 'Click again to clear'; setTimeout(() => { if (Date.now() - clearArm >= 3900) b.textContent = 'Clear'; }, 4000); }
};
$('content').addEventListener('paste', e => {
  const html = e.clipboardData && e.clipboardData.getData('text/html');
  if (html && /<(h[1-6]|p|li|a|table)\b/i.test(html)) { e.preventDefault(); const ta = $('content'); ta.setRangeText(htmlToMd(html), ta.selectionStart, ta.selectionEnd, 'end'); counters(); save(); }
});
FIELDS.concat(OPTS).forEach(f => $(f).addEventListener('input', () => { counters(); save(); }));
function printReport() {
  const prevView = VIEW; VIEW = 'dashboard'; render();
  document.querySelectorAll('.view').forEach(v => v.hidden = false);
  document.querySelectorAll('details.row').forEach(d => d.open = true);
  document.title = 'SEO audit - ' + (LAST.A.title || LAST.A.kwl || 'report');
  window.print();
  setTimeout(() => { document.title = 'Parix SEO Content Audit'; VIEW = prevView; render(); }, 500);
}

/* ----- sample ----- */
const SAMPLE = {
  kw: 'ai seo tools', kw2: 'seo content checker, keyword research', target: '1200', slug: 'ai-seo-tools', domain: 'parix.ai',
  title: 'AI SEO Tools: 7 We Tested for Content and Rankings (2026)',
  desc: 'We tested 7 AI SEO tools on real client sites. Compare features, pricing, and results, and find the right tool for your team.',
  content: `# AI SEO Tools: 7 We Tested for Content and Rankings

By Hafiz Panhwar, SEO & MarTech Executive at Parix.ai

AI SEO tools help you research keywords, write briefs and audit pages faster. We tested seven of them on three client sites for 30 days to see which ones actually improved rankings.

## What are AI SEO tools?

An AI SEO tool is software that uses language models to speed up SEO tasks such as keyword research, content briefs and on-page audits. It does not replace an SEO strategy, but it can cut hours of manual work.

## How we tested

We ran each tool on the same 40 blog posts. We tracked rankings in [Google Search Console](https://search.google.com/search-console/about) and measured how long each task took. In our tests, the best tools saved about 6 hours per week.

- Keyword research speed
- Brief quality
- Accuracy of on-page suggestions
- Price per seat

## The best AI SEO tools in 2026

| Tool | Best for | Price |
| --- | --- | --- |
| Tool A | Content briefs | $49/mo |
| Tool B | Technical audits | $99/mo |

Tool A is the best AI SEO tools option for writers. It is guaranteed to boost your rankings overnight. The briefs was generated in under a minute and they are the the most detailed we saw.

## How much do AI SEO tools cost?

Most plans cost between $29 and $199 per month. According to a 2024 survey, 64% of marketers now use AI for content.

## Frequently asked questions

### Can AI SEO tools write a whole article?

They can draft one, but you should edit it, add your own experience and check every fact before publishing.

## Conclusion

Pick a tool that fits your main task. Read our [technical SEO checklist](/blog/technical-seo-checklist/) next.`
};
$('sampleBtn').onclick = () => { setMode('text'); Object.keys(SAMPLE).forEach(k => $(k).value = SAMPLE[k]); counters(); save(); run(); };

load(); counters();
const old = store(':last'); if (old) PREV = old;
