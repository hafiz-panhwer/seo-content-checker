"use strict";
/* ===== The 100 checks. Every result comes from the article, the fetched page or a named data source. ===== */
const CATS = [
  { id: 'orig', name: 'Originality', w: 12 },
  { id: 'kw', name: 'Keywords & intent', w: 14 },
  { id: 'qual', name: 'Content quality', w: 16 },
  { id: 'read', name: 'Readability', w: 10 },
  { id: 'meta', name: 'Titles, meta & headings', w: 12 },
  { id: 'links', name: 'Links & images', w: 8 },
  { id: 'tech', name: 'Technical SEO', w: 12 },
  { id: 'eeat', name: 'E-E-A-T & trust', w: 10 },
  { id: 'adv', name: 'Competitors, AEO & GEO', w: 6 }
];
const METHOD = { M: 'Measured', E: 'Estimate', N: 'Needs data' };
const VAL = { pass: 1, warn: 0.5, fail: 0 };

/* ----- word lists ----- */
const PASSIVE = /\b(am|is|are|was|were|be|been|being)\s+(\w+ly\s+)?(\w+ed|built|done|made|given|taken|written|seen|known|shown|found|told|sold|paid|held|kept|left|lost|sent|chosen|driven|forgotten|hidden|broken|spoken|bought|brought|caught|taught|thought|understood|drawn|grown)\b/i;
const TRANSITIONS = ['also', 'besides', 'however', 'therefore', 'because', 'for example', 'for instance', 'in addition', 'moreover', 'furthermore', 'first', 'second', 'third', 'finally', 'next', 'then', 'meanwhile', 'as a result', 'consequently', 'similarly', 'likewise', 'on the other hand', 'in contrast', 'instead', 'although', 'though', 'since', 'thus', 'overall', 'in short', 'to sum up', 'after that', 'specifically', 'in fact', 'otherwise', 'for this reason', 'that said', 'even so', 'as well'];
const TRANS_RE = new RegExp('\\b(' + TRANSITIONS.map(rxe).join('|') + ')\\b', 'i');
const WORDY = [['in order to', 'to'], ['due to the fact that', 'because'], ['at this point in time', 'now'], ['for the purpose of', 'to'], ['in the event that', 'if'], ['a large number of', 'many'], ['a wide range of', 'many'], ['the majority of', 'most'], ['with regard to', 'about'], ['in spite of the fact that', 'although'], ['it is important to note that', '(remove)'], ["it's important to note that", '(remove)'], ['it is worth noting that', '(remove)'], ["it's worth noting that", '(remove)'], ['needless to say', '(remove)'], ['it goes without saying', '(remove)'], ['at the end of the day', '(remove)'], ['when it comes to', 'for'], ["in today's fast-paced world", '(remove)'], ["in today's digital age", '(remove)'], ['utilize', 'use'], ['utilizing', 'using'], ['leverage', 'use'], ['facilitate', 'help'], ['commence', 'start'], ['in close proximity to', 'near'], ['has the ability to', 'can'], ['is able to', 'can'], ['make a decision', 'decide'], ['take into consideration', 'consider'], ['plays a crucial role in', 'matters for'], ['plays a vital role in', 'matters for'], ['delve into', 'look at'], ['a plethora of', 'many'], ['myriad', 'many'], ['seamless', 'smooth'], ['cutting-edge', 'new'], ['state-of-the-art', 'modern'], ['game-changer', 'big change'], ['ever-evolving', 'changing'], ['unlock the potential', 'get more from'], ['very unique', 'unique'], ['completely eliminate', 'eliminate'], ['basically', '(remove)']].sort((a, b) => b[0].length - a[0].length);
const SPIN = ['man-made consciousness', 'profound learning', 'huge information', 'site design improvement', 'website streamlining', 'web crawler advancement', 'internet searcher', 'web index optimization', 'substance promoting', 'computerized showcasing', 'showcasing technique', 'normal language handling', 'client experience plan', 'counterfeit consciousness', 'quick earthy colored fox', 'bosom disease', 'malignant growth'];
const TYPO = { recieve: 'receive', seperate: 'separate', definately: 'definitely', occured: 'occurred', untill: 'until', accomodate: 'accommodate', acheive: 'achieve', beleive: 'believe', wich: 'which', teh: 'the', alot: 'a lot', existance: 'existence', goverment: 'government', enviroment: 'environment', begining: 'beginning', buisness: 'business', calender: 'calendar', comming: 'coming', concious: 'conscious', embarassing: 'embarrassing', foward: 'forward', freind: 'friend', grammer: 'grammar', independant: 'independent', knowlege: 'knowledge', neccessary: 'necessary', noticable: 'noticeable', occassion: 'occasion', persue: 'pursue', posession: 'possession', publically: 'publicly', recomend: 'recommend', refered: 'referred', relevent: 'relevant', sucess: 'success', succesful: 'successful', suprise: 'surprise', tommorow: 'tomorrow', truely: 'truly', wierd: 'weird', writting: 'writing', adress: 'address', arguement: 'argument', basicly: 'basically', completly: 'completely', diffrent: 'different', finaly: 'finally', garantee: 'guarantee', immediatly: 'immediately', occurence: 'occurrence', thier: 'their', dont: "don't", doesnt: "doesn't", isnt: "isn't", didnt: "didn't" };
const CONFUSED = [[/\bcould of\b/gi, 'could have'], [/\bshould of\b/gi, 'should have'], [/\bwould of\b/gi, 'would have'], [/\byour welcome\b/gi, "you're welcome"], [/\bthere is many\b/gi, 'there are many'], [/\bless people\b/gi, 'fewer people'], [/\bmore better\b/gi, 'better'], [/\bmore then\b/gi, 'more than'], [/\bbetter then\b/gi, 'better than'], [/\bthen ever\b/gi, 'than ever']];
const EXP_RE = /\b(I|we) (tested|tried|used|found|noticed|bought|reviewed|compared|measured|spent|visited|asked|ran|built|analy[sz]ed|interviewed|surveyed)\b|\bin my experience\b|\bour (team|test|tests|testing|data|clients?|results)\b|\bI've\b|\bwe've\b|\bhands-on\b|\bpersonally\b|\bwhen I\b|\bmy own\b/gi;
const EXAMPLE_RE = /\b(for example|for instance|e\.g\.|such as|case study|here's how|imagine)\b/gi;
const CLAIM_RE = /\b\d+(?:\.\d+)?\s?%|\b(stud(?:y|ies)|research|survey|according to|statistics|data shows|report(?:s|ed)? that|per ?cent|million|billion)\b/i;
const SUPER_RE = /\b(guarantee[sd]?|100% (?:safe|accurate|guaranteed|free|effective)|always works|never fails|proven to|scientifically proven|instant results|overnight success|risk-free|miracle|best ever|zero risk|#1 (?:best|tool|rated))\b/i;
const YMYL_RE = /\b(health|medical|disease|symptoms?|treatment|medicine|drugs?|diet|weight loss|pregnan\w*|mental health|loans?|mortgage|invest\w*|stocks?|crypto\w*|tax(es)?|insurance|retirement|credit|debt|banking|legal|lawyer|lawsuit|visa|immigration|safety|emergency|financ\w*)\b/i;
const AUTH_RE = /\.(gov|edu|mil)(\.[a-z]{2})?$|\.ac\.[a-z]{2}$|(^|\.)(who\.int|wikipedia\.org|nature\.com|sciencedirect\.com|springer\.com|developers\.google\.com|support\.google\.com|blog\.google|w3\.org|mozilla\.org|statista\.com|pewresearch\.org|reuters\.com|bbc\.co\.uk|bbc\.com|nytimes\.com|apnews\.com|moz\.com|ahrefs\.com|semrush\.com|searchengineland\.com|github\.com|ieee\.org|acm\.org|oecd\.org|worldbank\.org|imf\.org|un\.org|mayoclinic\.org|webmd\.com|investopedia\.com)$/i;
const COMMON_ACR = new Set('SEO AI URL URLS FAQ USA UK US EU UAE HTML CSS PDF API CEO OK TV PHP SQL CTA ROI B2B B2C KPI SaaS PPC CRM CMS SERP SERPs GA4 GSC CPU GPU RAM USB IT HR PR DIY NFT GPT LLM AM PM ID'.split(' '));
const GENERIC_HEAD = /^(introduction|intro|conclusion|final thoughts|summary|faqs?|frequently asked questions|table of contents|contents|related( posts| articles)?|share( this)?|comments?|about the author|references|sources|key takeaways|wrapping up|the bottom line|bottom line)\b/i;

/* ----- result helpers ----- */
const R = (s, v, d, loc) => ({ s, v: v || '', d: d || '', loc: loc || [] });
const PASS = (v, d, l) => R('pass', v, d, l), WARN = (v, d, l) => R('warn', v, d, l), FAIL = (v, d, l) => R('fail', v, d, l);
const NA = d => R('na', 'Not available', d);
const graded = (score, v, d, l, hi = 70, lo = 40) => R(score >= hi ? 'pass' : score >= lo ? 'warn' : 'fail', v, d, l);
const sloc = s => `Paragraph ${s.pi + 1}: "${cut(s.t, 130)}"`;
const ploc = p => `Paragraph ${p.pi + 1}: "${cut(p.text, 130)}"`;
const hloc = h => `H${h.level}: "${cut(h.text, 90)}"`;
const NOCOMP = 'Add competitor URLs under "Compare against competitors" to measure this.';
const NOPAGE = 'Runs in Live URL mode, or when you paste the full page HTML.';
const NOLIVE = 'Runs in Live URL mode.';

function intentOf(q) {
  q = (q || '').toLowerCase();
  if (/\b(buy|price|pricing|cost|cheap|deal|discount|coupon|order|hire|near me|for sale|download|free trial|subscribe)\b/.test(q)) return 'transactional';
  if (/\b(best|top|vs|versus|review|reviews|compare|comparison|alternatives?)\b/.test(q)) return 'commercial';
  if (/\b(login|log in|sign in|official site|website)\b/.test(q)) return 'navigational';
  return 'informational';
}
function entitiesOf(sents) {
  const m = new Map();
  sents.forEach(s => {
    const tk = s.split(/\s+/);
    for (let i = 1; i < tk.length; i++) {
      const w = tk[i].replace(/^[("'\[]+|[)"'\],.;:!?]+$/g, '');
      if (!/^[A-Z][A-Za-z0-9&.+-]*[A-Za-z0-9+]$/.test(w) && !/^[A-Z]{2,}\d*$/.test(w)) continue;
      let phrase = w, j = i + 1;
      while (j < tk.length && j < i + 4) {
        const n = tk[j].replace(/^[("'\[]+|[)"'\],.;:!?]+$/g, '');
        if (/^[A-Z][A-Za-z0-9&.+-]*$/.test(n) && !/[,.;:!?]$/.test(tk[j - 1])) { phrase += ' ' + n; j++; } else break;
      }
      i = j - 1;
      if (STOP.has(phrase.toLowerCase()) || phrase.length < 2) continue;
      m.set(phrase, (m.get(phrase) || 0) + 1);
    }
  });
  return m;
}
function basicGrammar(blocks) {
  const G = [];
  const snip = (t, i, l) => '"…' + t.slice(Math.max(0, i - 30), i + l + 30) + '…"';
  blocks.forEach(b => {
    const t = b.text; let m;
    const r1 = /\b(\w+)\s+\1\b/gi; while ((m = r1.exec(t))) if (!/^(that|had|very|bye|ha|no|so|\d+)$/i.test(m[1])) G.push({ type: 'grammar', msg: `Repeated word "${m[0]}"`, at: snip(t, m.index, m[0].length) });
    CONFUSED.forEach(([re, fix]) => { re.lastIndex = 0; while ((m = re.exec(t))) G.push({ type: 'grammar', msg: `"${m[0]}" → "${fix}"`, at: snip(t, m.index, m[0].length) }); });
    const r3 = /\s+[,;:!?](?!\d)/g; while ((m = r3.exec(t))) G.push({ type: 'grammar', msg: 'Space before punctuation', at: snip(t, m.index, m[0].length) });
    const r4 = /[a-z][,;][A-Za-z]|[a-z]{2}\.[A-Z][a-z]/g; while ((m = r4.exec(t))) G.push({ type: 'grammar', msg: 'Missing space after punctuation', at: snip(t, m.index, m[0].length) });
    const r5 = /\ban\s+([bcdfgjklmnpqrstvwxz]\w+)/gi; while ((m = r5.exec(t))) if (!/^(hour|honest|honor|honour|heir|herb|mba|seo|fbi|mri|nfl|nba|llm|sms|mp3|x-ray|faq)/i.test(m[1])) G.push({ type: 'grammar', msg: `"${m[0]}": use "a" before a consonant sound`, at: snip(t, m.index, m[0].length) });
    const r6 = /\ba\s+([aeio]\w+)/gi; while ((m = r6.exec(t))) if (!/^(one|once|eu|uni|use|usu|euro)/i.test(m[1])) G.push({ type: 'grammar', msg: `"${m[0]}": use "an ${m[1]}"`, at: snip(t, m.index, m[0].length) });
    const r7 = /\b[A-Za-z]+\b/g; while ((m = r7.exec(t))) { const lw = m[0].toLowerCase(); if (TYPO[lw]) G.push({ type: 'spelling', msg: `"${m[0]}" → "${TYPO[lw]}"`, at: snip(t, m.index, m[0].length) }); }
    if (b.type === 'p' && !b.list && !b.table) sentences(t).forEach(s => { if (/^[a-z]/.test(s) && !/^(e\.g|i\.e|iphone|ipad|ebay|www)/i.test(s)) G.push({ type: 'grammar', msg: 'Sentence starts with a lowercase letter', at: '"' + cut(s, 60) + '"' }); });
  });
  return G;
}

/* ===== Build the analysis context ===== */
function prepare(A) {
  const d = A.doc;
  A.kwl = norm(A.kw || '').toLowerCase().trim();
  A.kw2l = (A.kw2 || []).map(k => norm(k).toLowerCase().trim()).filter(Boolean);
  A.paras = []; A.heads = []; A.blocks = d.blocks;
  d.blocks.forEach((b, i) => { b.i = i; if (b.type === 'h') A.heads.push(b); else { b.pi = A.paras.length; A.paras.push(b); } });
  A.body = A.paras.map(p => p.text).join('\n');
  A.all = A.heads.map(h => h.text).join('\n') + '\n' + A.body;
  A.W = words(A.all); A.N = A.W.length; A.BW = words(A.body); A.bw = Math.max(1, A.BW.length);
  A.S = []; A.paras.forEach(p => { if (p.table) return; sentences(p.text).forEach(t => A.S.push({ t, w: words(t).length, pi: p.pi, links: p.links || 0 })); });
  A.sc = Math.max(1, A.S.length);
  A.tf = tf(stems(A.all)); A.top = topN(A.tf, 15).map(x => x[0]);
  A.kwStems = uniq(stems(A.kwl));
  A.topic = new Set([...A.kwStems, ...A.top.slice(0, 10)]);
  A.kc = A.kwl ? countPhrase(A.all, A.kwl) : 0;
  A.kn = A.kwl ? Math.max(1, words(A.kwl).length) : 1;
  A.density = A.N ? A.kc * A.kn / A.N * 100 : 0;
  A.intent = intentOf(A.kwl || A.title);
  A.h1s = A.heads.filter(h => h.level === 1); A.h2s = A.heads.filter(h => h.level === 2); A.subs = A.heads.filter(h => h.level > 1);
  A.qHeads = A.heads.filter(h => /\?$/.test(h.text) || /^(what|how|why|when|which|who|where|can|is|are|does|do|should|will)\b/i.test(h.text));
  A.sections = []; let cur = { head: null, words: 0, paras: 0, hasH3: false };
  d.blocks.forEach(b => {
    if (b.type === 'h' && b.level <= 2) { if (cur.head || cur.words) A.sections.push(cur); cur = { head: b, words: 0, paras: 0, hasH3: false }; }
    else if (b.type === 'h') cur.hasH3 = true;
    else { cur.words += words(b.text).length; cur.paras++; }
  });
  A.sections.push(cur);
  A.intro = A.paras.length && (!A.subs.length || A.paras[0].i < A.subs[0].i) ? A.paras[0] : null;
  // keyword positions in body (word index)
  A.kwPos = [];
  if (A.kwl) { const re = new RegExp('\\b' + rxe(A.kwl).replace(/\s+/g, '\\s+') + '\\b', 'gi'); let m; while ((m = re.exec(A.body))) A.kwPos.push(words(A.body.slice(0, m.index)).length); }
  // links
  const myHost = A.host;
  A.links = d.links.map(l => {
    const h = hostOf(l.abs);
    const internal = !/^[a-z][a-z0-9+.-]*:/i.test(l.href) || (myHost && h === myHost);
    return Object.assign({}, l, { host: h, internal });
  });
  A.intLinks = A.links.filter(l => l.internal); A.extLinks = A.links.filter(l => !l.internal && /^https?:/i.test(l.abs));
  A.images = d.images;
  // signals
  A.exp = []; A.S.forEach(s => { EXP_RE.lastIndex = 0; if (EXP_RE.test(s.t)) A.exp.push(s); });
  A.examples = (A.body.match(EXAMPLE_RE) || []).length;
  A.nums = (A.body.match(/\b\d[\d,.]*\s?(%|percent|hours?|days?|minutes?|years?|months?|kg|km|mph|usd|dollars?|x)?\b/gi) || []).length + (A.body.match(/[$₹€£]\s?\d/g) || []).length;
  A.numsPer300 = A.nums / Math.max(1, A.bw / 300);
  A.claims = A.S.filter(s => CLAIM_RE.test(s.t));
  A.uncited = A.claims.filter(s => !s.links);
  A.supers = A.S.filter(s => SUPER_RE.test(s.t) && !s.links);
  A.passive = A.S.filter(s => PASSIVE.test(s.t));
  A.longS = A.S.filter(s => s.w > 25);
  A.lists = A.paras.filter(p => p.list).length; A.ordered = A.paras.filter(p => p.ordered).length;
  A.tables = d.tables || 0;
  A.wordy = []; WORDY.forEach(([p, r]) => { const c = countPhrase(A.body, p); if (c) A.wordy.push({ p, r, c }); });
  A.spin = SPIN.filter(p => countPhrase(A.body, p));
  A.basic = basicGrammar(d.blocks);
  A.entities = entitiesOf(A.S.map(s => s.t));
  A.years = (A.all.match(/\b(19[5-9]\d|20[0-4]\d)\b/g) || []).map(Number).filter(y => y <= YEAR + 1);
  // internal duplicates
  const seenS = new Map(); A.dupSents = [];
  A.S.forEach(s => { const k = s.t.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); if (words(k).length < 6) return; if (seenS.has(k)) { if (seenS.get(k) === 1) A.dupSents.push(s); seenS.set(k, 2); } else seenS.set(k, 1); });
  const seenP = new Set(); A.dupParas = [];
  A.paras.forEach(p => { const k = p.text.toLowerCase(); if (words(k).length >= 15) { if (seenP.has(k)) A.dupParas.push(p); seenP.add(k); } });
  A.sentSets = A.S.map(s => new Set(stems(s.t)));
  A.similar = [];
  const lim = Math.min(A.S.length, 400);
  for (let i = 0; i < lim; i++) { if (A.sentSets[i].size < 5) continue; for (let j = i + 1; j < lim; j++) { if (A.sentSets[j].size < 5) continue; const jv = jaccard(A.sentSets[i], A.sentSets[j]); if (jv >= 0.7) A.similar.push([A.S[i], A.S[j], jv]); } }
  prepareCompetitors(A);
}

function prepareCompetitors(A) {
  A.comps = (A.compsRaw || []).filter(c => c.doc && c.doc.blocks && c.doc.blocks.length);
  const myTok = words(A.body).map(w => w.toLowerCase());
  const n = 7; A.myTok = myTok;
  A.matchSpans = []; A.uniqWording = 100;
  const matchedAny = new Array(Math.max(0, myTok.length - n + 1)).fill(false);
  A.comps.forEach(c => {
    c.host = hostOf(c.url) || c.url;
    c.paras = c.doc.blocks.filter(b => b.type === 'p'); c.heads = c.doc.blocks.filter(b => b.type === 'h');
    c.body = c.paras.map(p => p.text).join('\n'); c.all = c.heads.map(h => h.text).join('\n') + '\n' + c.body;
    c.N = words(c.all).length; c.tf = tf(stems(c.all));
    c.surface = new Map(); contentWords(c.all).forEach(w => { const s = stem(w); if (!c.surface.has(s)) c.surface.set(s, w); });
    const tok = words(c.body).map(w => w.toLowerCase());
    const set = new Set(); for (let i = 0; i + n <= tok.length; i++) set.add(tok.slice(i, i + n).join(' '));
    const hit = []; for (let i = 0; i + n <= myTok.length; i++) if (set.has(myTok.slice(i, i + n).join(' '))) { hit.push(i); matchedAny[i] = true; }
    c.sim = matchedAny.length ? hit.length / matchedAny.length * 100 : 0;
    c.spans = []; let s = null, e = null;
    hit.forEach(i => { if (s === null) { s = i; e = i + n; } else if (i <= e) e = i + n; else { c.spans.push([s, e]); s = i; e = i + n; } });
    if (s !== null) c.spans.push([s, e]);
    c.longest = c.spans.reduce((m, x) => Math.max(m, x[1] - x[0]), 0);
    c.spans.forEach(([a, b]) => A.matchSpans.push({ host: c.host, len: b - a, text: myTok.slice(a, b).join(' ') }));
    c.sents = []; c.paras.forEach(p => sentences(p.text).forEach(t => c.sents.push(t)));
    c.sentSets = c.sents.slice(0, 800).map(t => new Set(stems(t)));
    c.qHeads = c.heads.filter(h => /\?$/.test(h.text) || /^(what|how|why|when|which|who|where|can|is|are|does|do|should|will)\b/i.test(h.text));
    c.stats = {
      words: c.N, h2: c.heads.filter(h => h.level === 2).length, images: c.doc.images.length, lists: c.paras.filter(p => p.list).length,
      tables: c.doc.tables || 0, ext: c.doc.links.filter(l => /^https?:/i.test(l.abs) && hostOf(l.abs) !== hostOf(c.url)).length,
      numbers: (c.body.match(/\b\d[\d,.]*\b/g) || []).length, questions: c.qHeads.length
    };
    c.entities = entitiesOf(c.sents);
  });
  A.matchSpans.sort((a, b) => b.len - a.len);
  if (matchedAny.length && A.comps.length) A.uniqWording = 100 - matchedAny.filter(Boolean).length / matchedAny.length * 100;
  if (!A.comps.length) return;
  // paraphrase candidates
  A.paraphrased = [];
  A.S.forEach((s, i) => {
    const set = A.sentSets[i]; if (s.w < 10 || set.size < 5) return;
    let best = null;
    A.comps.forEach(c => c.sentSets.forEach((cs, k) => { if (cs.size < 5) return; const j = jaccard(set, cs); if (j >= 0.55 && (!best || j > best.j)) best = { j, host: c.host, their: c.sents[k] }; }));
    if (best) A.paraphrased.push({ s, ...best });
  });
  // semantic terms
  const need = A.comps.length >= 3 ? 2 : 1;
  const df = new Map(), total = new Map(), surface = new Map();
  A.comps.forEach(c => c.tf.forEach((v, k) => { if (v < (A.comps.length === 1 ? 3 : 2) || k.length < 3) return; df.set(k, (df.get(k) || 0) + 1); total.set(k, (total.get(k) || 0) + v); if (!surface.has(k)) surface.set(k, c.surface.get(k) || k); }));
  const brand = new Set(); A.comps.forEach(c => c.host.split('.').forEach(p => { if (p.length > 2) brand.add(stem(p)); }));
  const common = [...df.entries()].filter(([k, v]) => v >= need && !A.kwStems.includes(k) && !brand.has(k)).sort((a, b) => total.get(b[0]) - total.get(a[0])).slice(0, 30).map(x => x[0]);
  A.semCommon = common; A.semHave = common.filter(k => A.tf.has(k)); A.semMissing = common.filter(k => !A.tf.has(k)).map(k => surface.get(k));
  // topical coverage from competitor subheadings
  const myStems = new Set([...A.tf.keys()]);
  const seen = new Set(); A.compTopics = []; A.missingTopics = [];
  A.comps.forEach(c => c.heads.filter(h => h.level >= 2 && h.level <= 3 && !GENERIC_HEAD.test(h.text)).forEach(h => {
    const st = uniq(stems(h.text)); if (!st.length) return;
    const key = st.slice().sort().join(' '); if (seen.has(key)) return; seen.add(key);
    const covered = st.filter(x => myStems.has(x)).length / st.length >= 0.6;
    A.compTopics.push({ text: h.text, host: c.host, covered });
    if (!covered) A.missingTopics.push({ text: h.text, host: c.host });
  }));
  // information gain: share of my content bigrams absent from all competitors
  const bigr = t => { const s = stems(t), out = new Set(); for (let i = 0; i + 1 < s.length; i++) out.add(s[i] + ' ' + s[i + 1]); return out; };
  const mine = bigr(A.body), theirs = new Set(); A.comps.forEach(c => bigr(c.body).forEach(x => theirs.add(x)));
  let newB = 0; mine.forEach(x => { if (!theirs.has(x)) newB++; });
  A.gain = mine.size ? newB / mine.size * 100 : 0;
  // centroid similarity
  const cent = new Map(); A.comps.forEach(c => { const tot = [...c.tf.values()].reduce((a, b) => a + b, 0) || 1; c.tf.forEach((v, k) => cent.set(k, (cent.get(k) || 0) + v / tot)); });
  A.semSim = cosine(A.tf, cent);
  // competitor medians
  const med = arr => { const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  A.myStats = { words: A.N, h2: A.h2s.length, images: A.images.length, lists: A.lists, tables: A.tables, ext: A.extLinks.length, numbers: (A.body.match(/\b\d[\d,.]*\b/g) || []).length, questions: A.qHeads.length };
  A.median = {}; Object.keys(A.myStats).forEach(k => { A.median[k] = med(A.comps.map(c => c.stats[k])); });
  // competitor entities you don't mention
  const entDf = new Map(); A.comps.forEach(c => new Set(c.entities.keys()).forEach(e => entDf.set(e, (entDf.get(e) || 0) + 1)));
  const lowerMine = A.all.toLowerCase();
  const minCount = A.comps.length === 1 ? 2 : 1;
  A.missingEntities = [...entDf.entries()].filter(([e, v]) => v >= need && A.comps.filter(c => (c.entities.get(e) || 0) >= minCount).length >= Math.min(need, 1) && !brand.has(stem(e.toLowerCase())) && !lowerMine.includes(e.toLowerCase()) && e.length > 2).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0]);
  A.compQuestions = []; const qs = new Set();
  A.comps.forEach(c => c.qHeads.forEach(h => { const st = uniq(stems(h.text)); const key = st.slice().sort().join(' '); if (qs.has(key)) return; qs.add(key); const covered = st.length && st.filter(x => myStems.has(x)).length / st.length >= 0.6; if (!covered) A.compQuestions.push({ text: h.text, host: c.host }); }));
}

/* ===== The checks ===== */
const CHECKS = [
/* ---------- 1–10 Originality ---------- */
{ id: 1, cat: 'orig', name: 'Plagiarism percentage', m: 'E', crit: true,
  fix: 'Rewrite matching passages in your own words, or quote them and link the source.', ex: 'Replace a copied definition with your own explanation, then add "Source: [page name]" with a link.',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP + ' For a free manual check against the whole web, use the exact-match search links on the Dashboard.');
    const best = A.comps.reduce((a, c) => c.sim > a.sim ? c : a);
    const d = A.comps.map(c => `${esc(c.host)}: <b>${c.sim.toFixed(1)}%</b> of your 7-word phrases match (${c.spans.length} passages)`).join('<br>') + '<br>Compared only against the pages you supplied, not the whole web.';
    return R(best.sim <= 5 ? 'pass' : best.sim <= 15 ? 'warn' : 'fail', `${best.sim.toFixed(1)}% overlap with ${best.host}`, d, A.matchSpans.slice(0, 6).map(x => `Matches ${x.host} (${x.len} words): "${cut(x.text, 170)}"`));
  } },
{ id: 2, cat: 'orig', name: 'AI content detection', m: 'N', fix: 'Judge the content by checks 4, 10, 31 and 81 instead.', ex: '',
  run() { return NA('Not provided. No AI detector is accurate enough to give a trustworthy percentage. Independent tests show they often label human writing as AI. Google evaluates whether content is helpful, not how it was produced.'); } },
{ id: 3, cat: 'orig', name: 'Human-written probability', m: 'N', fix: 'Add first-hand experience, original data and examples. These are what readers and Google can see.', ex: '',
  run() { return NA('Not provided, for the same reason as check 2: any percentage would be a guess presented as a measurement.'); } },
{ id: 4, cat: 'orig', name: 'Content uniqueness', m: 'E',
  fix: 'Add details only you can give: your numbers, screenshots, tests and examples.', ex: '"We ran this checklist on 40 client pages; 31 had missing alt text."',
  run(A) {
    const spec = Math.min(40, A.numsPer300 * 20) + Math.min(30, A.examples * 10) + Math.min(30, A.exp.length * 10);
    if (A.comps.length) {
      const sc = A.uniqWording * 0.6 + spec * 0.4;
      return graded(sc, `${A.uniqWording.toFixed(0)}% unique wording · specificity ${Math.round(spec)}/100`, 'Unique wording = share of your 7-word phrases not found in any competitor page. Specificity counts numbers, examples and first-hand statements.');
    }
    return graded(spec, `Specificity ${Math.round(spec)}/100`, `Estimated from specific details: ${A.nums} numbers, ${A.examples} examples, ${A.exp.length} first-hand statements. Add competitor URLs to also measure unique wording.`);
  } },
{ id: 5, cat: 'orig', name: 'Duplicate content', m: 'M', crit: true,
  fix: 'Delete or merge repeated paragraphs and sentences.', ex: 'Keep the clearest version of a repeated paragraph and remove the other.',
  run(A) {
    const loc = [...A.dupParas.map(p => 'Repeated paragraph: ' + ploc(p)), ...A.dupSents.map(s => 'Repeated sentence: ' + sloc(s))];
    let d = 'Exact repeats inside this article.';
    if (A.page && A.page.canonical && A.url && A.canonNorm && A.canonNorm !== A.urlNorm) d += ' The canonical tag points to another URL, so Google may treat this page as a duplicate (see check 72).';
    return loc.length ? FAIL(`${loc.length} repeated block(s)`, d, loc) : PASS('No repeated paragraphs or sentences', d);
  } },
{ id: 6, cat: 'orig', name: 'Paraphrasing detection', m: 'E',
  fix: 'Rewrite these sentences from your own understanding instead of rewording the competitor.', ex: 'Add your own reason, number or example so the sentence says something theirs does not.',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    const L = A.paraphrased.slice().sort((a, b) => b.j - a.j);
    const loc = L.slice(0, 8).map(x => `${sloc(x.s)} ≈ ${x.host}: "${cut(x.their, 110)}" (${Math.round(x.j * 100)}% same words)`);
    return R(L.length === 0 ? 'pass' : L.length <= 2 ? 'warn' : 'fail', `${L.length} sentence(s) closely reworded`, 'Sentences sharing 55%+ of their meaningful words with a competitor sentence.', loc);
  } },
{ id: 7, cat: 'orig', name: 'Sentence similarity', m: 'M',
  fix: 'Merge near-identical sentences or make each one add new information.', ex: '',
  run(A) {
    const loc = A.similar.slice(0, 8).map(([a, b, j]) => `${sloc(a)} ↔ Paragraph ${b.pi + 1} (${Math.round(j * 100)}% same words)`);
    return R(A.similar.length === 0 ? 'pass' : A.similar.length <= 2 ? 'warn' : 'fail', `${A.similar.length} near-duplicate pair(s)`, 'Pairs of sentences in this article that share 70%+ of their meaningful words.', loc);
  } },
{ id: 8, cat: 'orig', name: 'Content spinning', m: 'M', crit: true,
  fix: 'Replace spun phrases with the normal term.', ex: '"site design improvement" → "search engine optimization"; "man-made consciousness" → "artificial intelligence".',
  run(A) { return A.spin.length ? FAIL(`${A.spin.length} spun phrase(s)`, 'Phrases typical of automatic synonym-swapping tools.', A.spin.map(p => `"${p}"`)) : PASS('No spinner phrases found', 'Checked against known synonym-swap outputs.'); } },
{ id: 9, cat: 'orig', name: 'Copyright risk', m: 'E', crit: true,
  fix: 'Quote and credit anything you keep word for word, and keep quotes short.', ex: 'As Google explains in its SEO Starter Guide, "…" [link].',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    const longest = Math.max(...A.comps.map(c => c.longest)), sim = Math.max(...A.comps.map(c => c.sim));
    const st = longest >= 40 || sim > 20 ? 'fail' : longest >= 20 || sim > 8 ? 'warn' : 'pass';
    return R(st, `Longest copied run: ${longest} words`, 'Flags long word-for-word passages for human review. This is not legal advice.', A.matchSpans.filter(x => x.len >= 20).slice(0, 5).map(x => `${x.host}: "${cut(x.text, 170)}"`));
  } },
{ id: 10, cat: 'orig', name: 'Original value score', m: 'E',
  fix: 'Add at least one thing a reader cannot get elsewhere: your test results, data, screenshots or a worked example.', ex: '"After switching to X, our crawl errors dropped from 212 to 9 in two weeks."',
  run(A) {
    let sc = Math.min(30, A.exp.length * 10) + Math.min(25, A.numsPer300 * 12) + Math.min(15, A.examples * 5) + (A.images.length ? 10 : 0);
    sc += A.comps.length ? Math.min(20, A.gain * 0.3) : 10;
    sc = Math.min(100, Math.round(sc));
    return graded(sc, `${sc}/100`, `Built from first-hand statements (${A.exp.length}), data points (${A.nums}), examples (${A.examples}), images (${A.images.length})${A.comps.length ? ` and information gain vs competitors (${A.gain.toFixed(0)}%)` : ''}.`);
  } },

/* ---------- 11–25 Keywords & intent ---------- */
{ id: 11, cat: 'kw', name: 'Primary keyword', m: 'M', crit: true,
  fix: 'Enter one primary keyword and make sure the article is clearly about it.', ex: 'Keyword "ai seo tools" → title, H1 and first paragraph all mention AI SEO tools.',
  run(A) {
    if (!A.kwl) return FAIL('No primary keyword entered', 'Enter the main search term this article should rank for. Most keyword checks depend on it.');
    const inTop = A.kwStems.filter(s => A.top.includes(s)).length / Math.max(1, A.kwStems.length);
    if (!A.kc) return FAIL('Keyword not used', `"${esc(A.kwl)}" does not appear in the article.`);
    return R(inTop >= 0.5 ? 'pass' : 'warn', inTop >= 0.5 ? 'Article is about the keyword' : 'Keyword is not a main topic', `Top topic words: ${A.top.slice(0, 8).map(esc).join(', ')}.`);
  } },
{ id: 12, cat: 'kw', name: 'Keyword density', m: 'M',
  fix: 'Use the keyword naturally. If density is high, replace some uses with synonyms or pronouns.', ex: '',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const d = A.density, v = `${d.toFixed(2)}% (${A.kc} uses in ${A.N} words)`;
    const note = 'There is no ideal density. This flags only extremes.';
    if (d > 3) return FAIL(v, note); if (d > 2.5) return WARN(v, note); if (d < 0.3) return WARN(v, 'Very low: the topic may be unclear to readers and search engines. ' + note);
    return PASS(v, note);
  } },
{ id: 13, cat: 'kw', name: 'Keyword stuffing', m: 'M', crit: true,
  fix: 'Remove forced repeats: keep the keyword once per sentence at most and vary headings.', ex: '"Best AI SEO tools: these AI SEO tools are the best AI SEO tools" → "The best AI SEO tools, compared".',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const multi = A.S.filter(s => countPhrase(s.t, A.kwl) >= 2);
    const hk = A.subs.filter(h => countPhrase(h.text, A.kwl));
    const heavyHeads = A.subs.length >= 3 && hk.length / A.subs.length > 0.6;
    const loc = multi.map(s => 'Keyword twice in one sentence: ' + sloc(s));
    if (heavyHeads) loc.push(`Keyword in ${hk.length} of ${A.subs.length} subheadings`);
    const st = A.density > 3 || multi.length > 2 ? 'fail' : (multi.length || heavyHeads || A.density > 2.5) ? 'warn' : 'pass';
    if (A.density > 2.5) loc.unshift(`Density ${A.density.toFixed(2)}% (${A.kc} uses in ${A.N} words)`);
    return R(st, st === 'pass' ? 'No stuffing' : `${loc.length} stuffing signal(s)`, 'Checks density, repeated use inside one sentence, and keyword-heavy headings.', loc);
  } },
{ id: 14, cat: 'kw', name: 'Keyword frequency', m: 'M',
  fix: 'Mention the main keyword a few times across the article, including the opening.', ex: '',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const rows = [`<b>${esc(A.kwl)}</b>: ${A.kc}`].concat(A.kw2l.map(k => `${esc(k)}: ${countPhrase(A.all, k)}`));
    return A.kc ? PASS(`${A.kc} uses`, rows.join('<br>')) : FAIL('0 uses', rows.join('<br>'));
  } },
{ id: 15, cat: 'kw', name: 'Keyword prominence', m: 'M',
  fix: 'Place the keyword in the title, H1, first 100 words and URL.', ex: 'Opening line: "Choosing AI SEO tools is easier when you know these five features."',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const first100 = A.BW.slice(0, 100).join(' ');
    const places = [
      ['Meta title', countPhrase(A.title || '', A.kwl) > 0], ['H1', A.h1s.some(h => countPhrase(h.text, A.kwl))],
      ['First 100 words', countPhrase(first100, A.kwl) > 0], ['URL', !!A.slugWords.length && A.kwStems.every(s => A.slugWords.map(stem).includes(s))],
      ['Meta description', countPhrase(A.desc || '', A.kwl) > 0], ['A subheading', A.subs.some(h => countPhrase(h.text, A.kwl))]
    ];
    const n = places.filter(p => p[1]).length;
    return R(n >= 5 ? 'pass' : n >= 3 ? 'warn' : 'fail', `${n} of 6 key places`, places.map(p => (p[1] ? '✓ ' : '✗ ') + p[0]).join('<br>'));
  } },
{ id: 16, cat: 'kw', name: 'Secondary keywords', m: 'M',
  fix: 'Work each secondary keyword in naturally at least once, ideally in a subheading.', ex: '',
  run(A) {
    if (!A.kw2l.length) return NA('No secondary keywords entered.');
    const rows = A.kw2l.map(k => ({ k, c: countPhrase(A.all, k) }));
    const miss = rows.filter(r => !r.c), over = rows.filter(r => r.c * words(r.k).length / Math.max(1, A.N) * 100 > 2);
    return R(miss.length || over.length ? 'warn' : 'pass', `${rows.length - miss.length} of ${rows.length} used`, rows.map(r => `${esc(r.k)}: ${r.c}`).join('<br>'), [...miss.map(r => `Missing: "${r.k}"`), ...over.map(r => `Overused: "${r.k}"`)]);
  } },
{ id: 17, cat: 'kw', name: 'Semantic keywords', m: 'E',
  fix: 'Cover the related terms that top pages use, where they fit your article.', ex: '',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    if (!A.semCommon.length) return NA('Competitor pages were too short to extract shared terms.');
    const cov = A.semHave.length / A.semCommon.length * 100;
    return graded(cov, `${cov.toFixed(0)}% of shared competitor terms covered`, `Terms used repeatedly across competitor pages. Missing: ${A.semMissing.slice(0, 15).map(esc).join(', ') || 'none'}.`, [], 70, 45);
  } },
{ id: 18, cat: 'kw', name: 'Related terms (often called LSI)', m: 'E',
  fix: 'Mention the concepts that naturally go with your keyword.', ex: 'For "ai seo tools": keyword research, content briefs, rank tracking, pricing.',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const co = new Map();
    A.S.filter(s => A.kwStems.some(k => stems(s.t).includes(k))).forEach(s => stems(s.t).forEach(w => { if (!A.kwStems.includes(w)) co.set(w, (co.get(w) || 0) + 1); }));
    const rel = topN(co, 10).filter(x => x[1] >= 2).map(x => x[0]);
    return R(rel.length >= 5 ? 'pass' : 'warn', `${rel.length} related terms used near the keyword`, '"LSI keywords" is an SEO term, not a Google requirement. This lists concepts you mention alongside the keyword: ' + (rel.map(esc).join(', ') || 'none') + '.');
  } },
{ id: 19, cat: 'kw', name: 'Long-tail keywords', m: 'M',
  fix: 'Answer specific longer searches in subheadings.', ex: '"How much do AI SEO tools cost?" as an H2.',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const toks = A.W.map(w => w.toLowerCase()), found = new Map();
    for (const n of [3, 4, 5]) for (let i = 0; i + n <= toks.length; i++) { const g = toks.slice(i, i + n); if (STOP.has(g[0]) || STOP.has(g[n - 1])) continue; if (!g.some(w => A.kwStems.includes(stem(w)))) continue; const k = g.join(' '); found.set(k, (found.get(k) || 0) + 1); }
    const lt = [...found.entries()].filter(x => x[1] >= 2 && x[0] !== A.kwl).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const qh = A.qHeads.filter(h => A.kwStems.some(k => stems(h.text).includes(k)));
    return R(lt.length + qh.length >= 2 ? 'pass' : 'warn', `${lt.length} phrases, ${qh.length} question headings`, 'Longer phrases containing your keyword, used 2+ times: ' + (lt.map(x => `"${esc(x[0])}" ×${x[1]}`).join(', ') || 'none') + '.');
  } },
{ id: 20, cat: 'kw', name: 'Keyword variations', m: 'M',
  fix: 'Use natural forms (plural, -ing, rearranged) instead of repeating the exact phrase.', ex: '"SEO tool", "tools for SEO", "AI-powered SEO".',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    const re = variantRegex(A.kwl); const all = re ? (A.all.match(re) || []).length : 0; const variants = Math.max(0, all - A.kc);
    if (A.kc > 5 && !variants) return WARN(`${A.kc} exact, 0 variations`, 'Repeating only the exact phrase reads unnaturally.');
    return PASS(`${A.kc} exact · ${variants} variations`, 'Counts plural and other word-ending forms of the keyword.');
  } },
{ id: 21, cat: 'kw', name: 'Keyword distribution', m: 'M',
  fix: 'Spread mentions across the introduction, body and conclusion.', ex: '',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.');
    if (A.kwPos.length < 2) return NA('The keyword appears fewer than 2 times in the body, so distribution cannot be measured.');
    const q = [0, 0, 0, 0]; A.kwPos.forEach(p => q[Math.min(3, Math.floor(p / A.bw * 4))]++);
    const max = Math.max(...q) / A.kwPos.length;
    const st = max >= 0.7 ? 'warn' : (!q[0] && !q[1]) ? 'warn' : 'pass';
    return R(st, `Quarters: ${q.join(' · ')}`, 'Keyword uses in each quarter of the article.' + (max >= 0.7 ? ' Most uses are bunched in one place.' : ''));
  } },
{ id: 22, cat: 'kw', name: 'Keyword cannibalization', m: 'E',
  fix: 'If another page targets the same search, merge them, or change one page\'s focus and link between them.', ex: '',
  run(A) {
    const hits = [];
    const kwS = A.kwStems; if (!kwS.length) return NA('Enter a primary keyword.');
    const kwSlug = words(A.kwl).map(w => w.toLowerCase()).join('-');
    const competes = text => {
      const t = text.toLowerCase(); if (kwSlug && t.replace(/[\s_/]+/g, '-').includes(kwSlug)) return true;
      const st = stems(t.replace(/https?:\/\/[^/]+/, '').replace(/[-_/]/g, ' '));
      return kwS.every(k => st.includes(k)) && st.filter(x => !kwS.includes(x)).length <= 2;
    };
    if (A.sitemap && A.sitemap.urls.length) A.sitemap.urls.forEach(u => {
      if (A.urlNorm && normUrl(u) === A.urlNorm) return;
      let p = ''; try { p = new URL(u).pathname; } catch (e) { return; }
      if (competes(p.split('/').filter(Boolean).pop() || '')) hits.push('Sitemap: ' + u);
    });
    (A.others || []).forEach(o => { if (competes(o)) hits.push('Your list: ' + o); });
    if (!(A.sitemap && A.sitemap.urls.length) && !(A.others || []).length) return NA('Add your other page titles/URLs, or use Live URL mode so your sitemap is read. Google Search Console shows real overlap.');
    return R(hits.length ? 'warn' : 'pass', hits.length ? `${hits.length} page(s) may target the same keyword` : 'No competing pages found', 'Matched by keyword words in URLs and titles. Confirm in Search Console (Performance → Query → Pages).', hits.slice(0, 10));
  } },
{ id: 23, cat: 'kw', name: 'Search intent match', m: 'E',
  fix: 'Match the format searchers expect for this intent.', ex: 'Commercial "best X" searches expect a comparison table, pros and cons, and a verdict.',
  run(A) {
    const s = A.sig, it = A.intent; let need = [];
    if (it === 'informational') need = [['Direct definition or answer', s.definition || A.qHeads.length > 0], ['Lists or steps', A.lists > 0 || s.steps], ['Examples', A.examples > 0]];
    if (it === 'commercial') need = [['Comparison language', s.compare], ['Table or list of options', A.tables > 0 || A.lists >= 3], ['Prices or specifics', s.prices || A.numsPer300 > 1], ['A verdict or recommendation', s.verdict]];
    if (it === 'transactional') need = [['Call to action', s.cta], ['Price information', s.prices], ['Trust details (reviews, guarantee, refund)', s.trustWords]];
    if (it === 'navigational') need = [['Brand or site name in title', !!A.title]];
    const n = need.filter(x => x[1]).length;
    return graded(n / need.length * 100, `${it} intent · ${n}/${need.length} signals`, `Intent estimated from the keyword wording. Expected for ${it} searches:<br>` + need.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'), [], 75, 50);
  } },
{ id: 24, cat: 'kw', name: 'Keyword difficulty', m: 'N', fix: 'Look up difficulty in Ahrefs, Semrush or a similar tool before writing.', ex: '',
  run() { return NA('Needs keyword data from a paid SEO provider (Ahrefs, Semrush, DataForSEO). No free API provides it.'); } },
{ id: 25, cat: 'kw', name: 'Search volume', m: 'N', fix: 'Check volume in Google Keyword Planner (free with a Google Ads account) or an SEO tool.', ex: '',
  run() { return NA('Needs keyword data from Google Keyword Planner or a paid SEO provider.'); } },

/* ---------- 26–40 Content quality ---------- */
{ id: 26, cat: 'qual', name: 'Thin content', m: 'M', crit: true,
  fix: 'Expand with the subtopics, examples and details a reader needs to finish their task.', ex: '',
  run(A) { const v = `${A.N} words`; if (A.N < 300) return FAIL(v, 'Under 300 words rarely satisfies a search.'); if (A.N < A.target * 0.5) return WARN(v, `Less than half your ${A.target}-word target.`); return PASS(v); } },
{ id: 27, cat: 'qual', name: 'Word count vs target', m: 'M',
  fix: 'Adjust length to the target, or change the target if the topic needs less or more.', ex: '',
  run(A) { const r = A.N / A.target; const v = `${A.N} of ${A.target} words (${Math.round(r * 100)}%)`; return R(r >= 0.85 && r <= 1.6 ? 'pass' : r >= 0.6 && r <= 2.2 ? 'warn' : 'fail', v, 'The target is your own setting. Google has no word-count requirement.'); } },
{ id: 28, cat: 'qual', name: 'Content depth', m: 'E',
  fix: 'Give each main section enough explanation, an example and specifics.', ex: '',
  run(A) {
    const secs = A.sections.filter(s => s.head && s.head.level === 2);
    const thinSecs = secs.filter(s => s.words < 80);
    let sc = Math.min(30, secs.length * 6) + Math.min(25, A.numsPer300 * 10) + Math.min(20, A.examples * 7) + (thinSecs.length ? 0 : 15);
    if (A.comps.length && A.median.words) sc += Math.min(10, A.N / A.median.words * 10); else sc += 10;
    return graded(Math.round(sc), `${Math.round(sc)}/100`, `${secs.length} main sections, ${thinSecs.length} under 80 words${A.comps.length ? `, competitor median ${Math.round(A.median.words)} words` : ''}.`, thinSecs.map(s => 'Thin section: ' + hloc(s.head) + ` (${s.words} words)`));
  } },
{ id: 29, cat: 'qual', name: 'Topical coverage', m: 'E',
  fix: 'Add sections for important subtopics that top pages cover and you skip.', ex: '',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    if (!A.compTopics.length) return NA('Competitor pages had no usable subheadings.');
    const cov = (A.compTopics.length - A.missingTopics.length) / A.compTopics.length * 100;
    return graded(cov, `${cov.toFixed(0)}% of competitor subtopics covered`, 'A competitor subheading counts as covered when 60% of its key words appear in your article.', A.missingTopics.slice(0, 10).map(t => `Missing: "${cut(t.text, 80)}" (${t.host})`), 75, 50);
  } },
{ id: 30, cat: 'qual', name: 'Topical authority (site)', m: 'E',
  fix: 'Publish supporting articles on related subtopics and link them to this page.', ex: '',
  run(A) {
    if (!(A.sitemap && A.sitemap.urls.length)) return NA(NOLIVE + ' Reads your sitemap to count related pages.');
    const need = Math.min(2, A.kwStems.length);
    if (!need) return NA('Enter a primary keyword.');
    const rel = A.sitemap.urls.filter(u => { if (A.urlNorm && normUrl(u) === A.urlNorm) return false; let p = ''; try { p = new URL(u).pathname; } catch (e) { return false; } const s = words(p.replace(/[-_/]/g, ' ')).map(w => stem(w.toLowerCase())); return A.kwStems.filter(k => s.includes(k)).length >= need; });
    return R(rel.length >= 5 ? 'pass' : rel.length >= 2 ? 'warn' : 'fail', `${rel.length} related page(s) on your site`, `Pages in your sitemap whose URL shares a keyword word${A.sitemap.partial ? ' (only the first 3 sitemap files were read)' : ''}.`, rel.slice(0, 8));
  } },
{ id: 31, cat: 'qual', name: 'Information gain', m: 'E',
  fix: 'Add something the top pages lack: original data, a new angle, a template or a worked example.', ex: '',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    return graded(A.gain, `${A.gain.toFixed(0)}% new concepts`, 'Share of your two-word concepts that appear in none of the competitor pages.', [], 55, 35);
  } },
{ id: 32, cat: 'qual', name: 'Content relevance', m: 'E',
  fix: 'Cut or tie back paragraphs that drift from the topic.', ex: '',
  run(A) {
    const off = A.paras.filter(p => !p.list && !p.table && words(p.text).length >= 30 && !stems(p.text).some(s => A.topic.has(s)));
    return R(off.length === 0 ? 'pass' : off.length <= 2 ? 'warn' : 'fail', `${off.length} off-topic paragraph(s)`, 'Paragraphs (30+ words) that share no words with the keyword or the article\'s main topic words.', off.slice(0, 8).map(ploc));
  } },
{ id: 33, cat: 'qual', name: 'Factual claims to verify', m: 'E',
  fix: 'Verify each statistic or study and link the original source next to it.', ex: '"73% of marketers… (HubSpot, 2026 State of Marketing [link])"',
  run(A) {
    const u = A.uncited;
    return R(u.length === 0 ? 'pass' : 'warn', `${A.claims.length} claims · ${u.length} without a source link`, 'This tool cannot confirm facts. It lists claims (numbers, studies, surveys) that have no link in the same paragraph so you can verify them.', u.slice(0, 10).map(sloc));
  } },
{ id: 34, cat: 'qual', name: 'Content freshness', m: 'M',
  fix: 'Update old years, statistics and examples, and show an "Updated" date.', ex: '',
  run(A) {
    const issues = [];
    const ty = (A.title || '').match(/\b(20\d\d)\b/); if (ty && +ty[1] < YEAR) issues.push(`Title says ${ty[1]}`);
    const maxY = A.years.length ? Math.max(...A.years) : null;
    if (maxY && maxY < YEAR - 2 && A.claims.length) issues.push(`Newest year mentioned is ${maxY}`);
    if (A.page && A.page.modified) { const age = (Date.now() - Date.parse(A.page.modified)) / 864e5; if (age > 540) issues.push(`Last modified ${Math.round(age / 30)} months ago`); }
    const st = ty && +ty[1] < YEAR ? 'fail' : issues.length ? 'warn' : 'pass';
    return R(st, issues.length ? issues.join(' · ') : 'No outdated dates found', `Years mentioned: ${uniq(A.years).sort().join(', ') || 'none'}.`);
  } },
{ id: 35, cat: 'qual', name: 'Content completeness', m: 'E',
  fix: 'Include an introduction that answers the question, the main sections, an FAQ and a conclusion.', ex: '',
  run(A) {
    const items = [['Introduction before the first section', !!A.intro && words(A.intro.text).length >= 25], ['Answers the keyword early', A.sig.earlyAnswer], ['FAQ or question sections', A.qHeads.length >= 2], ['Conclusion or summary', A.heads.some(h => /conclusion|summary|final thoughts|bottom line|takeaway|wrap/i.test(h.text))], ['3+ main sections', A.h2s.length >= 3]];
    const n = items.filter(x => x[1]).length;
    return graded(n / items.length * 100, `${n} of ${items.length} parts present`, items.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'), [], 80, 50);
  } },
{ id: 36, cat: 'qual', name: 'Search intent satisfaction', m: 'E',
  fix: 'Give readers what they need to finish their task, not only background.', ex: '',
  run(A) {
    const s = A.sig, it = A.intent; let need;
    if (it === 'commercial') need = [['Verdict or "best for" picks', s.verdict], ['Pros and cons', /pros|cons|drawback|downside/i.test(A.all)], ['Prices', s.prices], ['Comparison table', A.tables > 0]];
    else if (it === 'transactional') need = [['Clear next step', s.cta], ['Price', s.prices], ['Trust details', s.trustWords], ['FAQ', A.qHeads.length > 0]];
    else need = [['Step-by-step or list', A.ordered > 0 || s.steps || A.lists >= 3], ['Examples', A.examples > 0], ['Specific numbers', A.numsPer300 >= 1], ['Next step or summary', A.heads.some(h => /conclusion|summary|next|takeaway|bottom line/i.test(h.text))]];
    const n = need.filter(x => x[1]).length;
    return graded(n / need.length * 100, `${n}/${need.length} for ${it} intent`, need.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'), [], 75, 50);
  } },
{ id: 37, cat: 'qual', name: 'Helpful content score', m: 'E', late: true,
  fix: 'Improve the weakest of: original value, depth, completeness, intent, expertise and experience.', ex: '',
  run(A, res) {
    const ids = [10, 28, 31, 35, 36, 39, 81].filter(i => res[i] && res[i].s !== 'na');
    const sc = Math.round(ids.reduce((a, i) => a + VAL[res[i].s], 0) / Math.max(1, ids.length) * 100);
    return graded(sc, `${sc}/100`, `Custom score combining checks ${ids.join(', ')}. This is not a Google metric.`);
  } },
{ id: 38, cat: 'qual', name: 'Content redundancy', m: 'M',
  fix: 'Remove repeated points and phrases. Say each thing once.', ex: '',
  run(A) {
    const toks = A.W.map(w => w.toLowerCase()), g = new Map();
    for (let i = 0; i + 3 <= toks.length; i++) { const t = toks.slice(i, i + 3); if (STOP.has(t[0]) || STOP.has(t[2])) continue; const k = t.join(' '); if (k === A.kwl) continue; g.set(k, (g.get(k) || 0) + 1); }
    const rep = [...g.entries()].filter(x => x[1] >= 4).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const n = rep.length + A.similar.length + A.dupSents.length;
    return R(n === 0 ? 'pass' : n <= 3 ? 'warn' : 'fail', `${n} repetition signal(s)`, 'Repeated 3-word phrases (4+ times), near-duplicate sentences and exact repeats.', rep.map(x => `"${x[0]}" ×${x[1]}`));
  } },
{ id: 39, cat: 'qual', name: 'Expertise demonstration', m: 'E',
  fix: 'Explain why, not only what. Add reasoning, specifics and sources.', ex: '"This matters because Google renders JavaScript in a second wave, so…"',
  run(A) {
    const because = (A.body.match(/\b(because|which means|this is why|the reason|so that|as a result)\b/gi) || []).length;
    let sc = Math.min(30, because / Math.max(1, A.bw / 400) * 10) + Math.min(25, A.numsPer300 * 10) + Math.min(20, A.extLinks.length * 7) + Math.min(25, A.exp.length * 8);
    sc = Math.round(sc);
    return graded(sc, `${sc}/100`, `Explanations (${because}), data points (${A.nums}), cited sources (${A.extLinks.length}), first-hand statements (${A.exp.length}).`);
  } },
{ id: 40, cat: 'qual', name: 'Unsupported claims', m: 'M', crit: true,
  fix: 'Back up strong claims with a source, or soften them.', ex: '"guaranteed #1 ranking" → "can improve rankings, as our case study shows [link]".',
  run(A) { const L = A.supers; return R(L.length === 0 ? 'pass' : L.length <= 2 ? 'warn' : 'fail', `${L.length} strong claim(s) without a source`, 'Guarantees, "proven", "#1", "risk-free" and similar, in paragraphs with no link.', L.slice(0, 8).map(sloc)); } },

/* ---------- 41–50 Readability ---------- */
{ id: 41, cat: 'read', name: 'Flesch Reading Ease', m: 'M',
  fix: 'Use shorter sentences and everyday words.', ex: '',
  run(A) { const f = A.flesch; return R(f >= 60 ? 'pass' : f >= 45 ? 'warn' : 'fail', `${f.toFixed(0)} / 100`, '60+ is easy for most web readers. Technical audiences can accept 45–60.'); } },
{ id: 42, cat: 'read', name: 'Flesch-Kincaid grade', m: 'M', fix: 'Aim for about grade 8–9 for general readers.', ex: '',
  run(A) { const g = A.grade; return R(g <= 9 ? 'pass' : g <= 12 ? 'warn' : 'fail', `Grade ${g.toFixed(1)}`, 'Approximate US school grade needed to read the text easily.'); } },
{ id: 43, cat: 'read', name: 'Grammar errors', m: 'M', crit: true,
  fix: 'Fix each issue listed. Ignore suggestions that do not fit your style.', ex: '',
  run(A) {
    if (A.lt && A.lt.matches) {
      const g = A.lt.matches.filter(m => !['TYPOS', 'STYLE', 'TYPOGRAPHY'].includes(m.rule && m.rule.category && m.rule.category.id));
      const rate = g.length / Math.max(1, A.N / 1000);
      return R(g.length === 0 ? 'pass' : rate <= 4 ? 'warn' : 'fail', `${g.length} issue(s) (LanguageTool)`, 'Full grammar, punctuation and word-choice check by LanguageTool.', g.slice(0, 25).map(ltLoc));
    }
    const g = A.basic.filter(x => x.type === 'grammar');
    return R(g.length === 0 ? 'pass' : g.length <= 3 ? 'warn' : 'fail', `${g.length} issue(s) (basic check)`, (A.lt && A.lt.error ? 'LanguageTool was unavailable: ' + esc(A.lt.error) + ' ' : '') + 'Basic built-in check only. Turn on the full grammar check in Settings.', g.slice(0, 20).map(x => `${x.msg}: ${x.at}`));
  } },
{ id: 44, cat: 'read', name: 'Spelling errors', m: 'M',
  fix: 'Correct misspellings. Brand and product names may be flagged; ignore those.', ex: '',
  run(A) {
    const local = A.basic.filter(x => x.type === 'spelling');
    const lt = A.lt && A.lt.matches ? A.lt.matches.filter(m => m.rule && m.rule.category && m.rule.category.id === 'TYPOS') : [];
    const n = lt.length + local.length, rate = n / Math.max(1, A.N / 1000);
    return R(n === 0 ? 'pass' : rate <= 5 ? 'warn' : 'fail', `${n} possible misspelling(s)`, A.lt && A.lt.matches ? 'LanguageTool spelling plus common-misspelling list.' : 'Common-misspelling list only. Turn on the full grammar check for complete spelling.', [...local.map(x => `${x.msg}: ${x.at}`), ...lt.slice(0, 25).map(ltLoc)]);
  } },
{ id: 45, cat: 'read', name: 'Sentence length', m: 'M',
  fix: 'Split sentences over 25 words.', ex: '',
  run(A) { const avg = A.bw / A.sc, p = pct(A.longS.length, A.sc); return R(avg <= 20 && p <= 20 ? 'pass' : avg <= 25 && p <= 30 ? 'warn' : 'fail', `Average ${avg.toFixed(1)} words · ${p.toFixed(0)}% over 25`, 'Aim for an average of 15–20 words with under 20% long sentences.', A.longS.slice(0, 10).map(s => `${s.w} words: ` + sloc(s))); } },
{ id: 46, cat: 'read', name: 'Paragraph length', m: 'M',
  fix: 'Keep paragraphs to 2–4 sentences, especially for mobile readers.', ex: '',
  run(A) { const L = A.paras.filter(p => !p.list && !p.table && (words(p.text).length > 120 || sentences(p.text).length > 5)); return R(L.length === 0 ? 'pass' : L.length <= 2 ? 'warn' : 'fail', `${L.length} long paragraph(s)`, 'Paragraphs over 120 words or 5 sentences.', L.slice(0, 8).map(p => `${words(p.text).length} words: ` + ploc(p))); } },
{ id: 47, cat: 'read', name: 'Passive voice', m: 'M',
  fix: 'Rewrite with the doer first.', ex: '"The report was written by our team" → "Our team wrote the report".',
  run(A) { const p = pct(A.passive.length, A.sc); return R(p <= 10 ? 'pass' : p <= 15 ? 'warn' : 'fail', `${p.toFixed(0)}% of sentences`, 'Under 10% reads well.', A.passive.slice(0, 10).map(sloc)); } },
{ id: 48, cat: 'read', name: 'Transition words', m: 'M',
  fix: 'Connect ideas with words like because, however, for example and as a result.', ex: '',
  run(A) { const n = A.S.filter(s => TRANS_RE.test(s.t)).length, p = pct(n, A.sc); return R(p >= 20 ? 'pass' : p >= 10 ? 'warn' : 'fail', `${p.toFixed(0)}% of sentences`, 'Sentences containing a linking word. 20%+ usually reads smoothly.'); } },
{ id: 49, cat: 'read', name: 'Tone consistency', m: 'E',
  fix: 'Pick one voice (for example "we" plus "you") and keep it throughout.', ex: '',
  run(A) {
    const issues = [];
    const I = (A.body.match(/\bI\b/g) || []).length, we = (A.body.match(/\bwe\b/gi) || []).length;
    if (I > 2 && we > 2) issues.push(`Switches between "I" (${I}) and "we" (${we})`);
    const ex = (A.body.match(/!/g) || []).length; if (ex > 3) issues.push(`${ex} exclamation marks`);
    const slang = A.body.match(/\b(gonna|wanna|kinda|sorta|lol|omg|u r|btw|imo|tbh)\b/gi) || []; if (slang.length) issues.push('Slang: ' + uniq(slang.map(s => s.toLowerCase())).join(', '));
    const caps = (A.body.match(/\b[A-Z]{5,}\b/g) || []).filter(w => !COMMON_ACR.has(w)); if (caps.length > 3) issues.push(`${caps.length} shouted ALL-CAPS words`);
    return R(issues.length === 0 ? 'pass' : issues.length === 1 ? 'warn' : 'fail', issues.length ? `${issues.length} tone issue(s)` : 'Consistent tone', 'Checks voice switching, exclamation marks, slang and all caps.', issues);
  } },
{ id: 50, cat: 'read', name: 'Clarity', m: 'E',
  fix: 'Replace wordy phrases, define acronyms the first time, and prefer short words.', ex: '"in order to" → "to"; "CWV" → "Core Web Vitals (CWV)".',
  run(A) {
    const complex = pct(A.BW.filter(w => syl(w) >= 4).length, A.bw);
    const acr = uniq((A.body.match(/\b[A-Z]{2,6}s?\b/g) || []).filter(a => !COMMON_ACR.has(a) && !COMMON_ACR.has(a.replace(/s$/, ''))));
    const undefinedAcr = acr.filter(a => !new RegExp('\\(' + a + '\\)|' + a + ' \\(').test(A.all));
    const n = A.wordy.length + (complex > 10 ? 1 : 0) + undefinedAcr.length;
    return R(n === 0 ? 'pass' : n <= 4 ? 'warn' : 'fail', `${A.wordy.length} wordy phrases · ${undefinedAcr.length} undefined acronyms`, `${complex.toFixed(0)}% of words have 4+ syllables.`, [...A.wordy.map(w => `"${w.p}" → ${w.r} (×${w.c})`), ...undefinedAcr.slice(0, 8).map(a => `Acronym not defined: ${a}`)]);
  } },

/* ---------- 51–60 Titles, meta & headings ---------- */
{ id: 51, cat: 'meta', name: 'SEO title length', m: 'M', crit: true,
  fix: 'Keep the title about 50–60 characters so Google shows all of it.', ex: '"AI SEO Tools: 9 We Tested for Content and Rankings (2026)"',
  run(A) {
    if (!A.title) return FAIL('No title', 'Enter the meta title (or audit the live URL).');
    const w = px(A.title, '20px Arial'), v = `${A.title.length} characters · ${Math.round(w)}px`;
    if (w > 600) return WARN(v, 'Google shows roughly 580–600px on desktop. The end will be cut off.');
    if (A.title.length < 30) return WARN(v, 'Short titles waste space you could use for benefits.');
    return PASS(v, 'Fits in Google results.');
  } },
{ id: 52, cat: 'meta', name: 'Title keyword placement', m: 'M',
  fix: 'Put the main topic near the start of the title.', ex: '',
  run(A) {
    if (!A.kwl) return NA('Enter a primary keyword.'); if (!A.title) return NA('No title.');
    const i = A.title.toLowerCase().indexOf(A.kwl);
    if (i < 0) { const some = A.kwStems.every(s => stems(A.title).includes(s)); return some ? WARN('Keyword words present, not as a phrase', 'The words appear but not together.') : FAIL('Keyword not in title'); }
    return i <= A.title.length * 0.4 ? PASS('Near the start') : WARN('Late in the title', 'Words at the start carry more weight and are never cut off.');
  } },
{ id: 53, cat: 'meta', name: 'Title uniqueness', m: 'E',
  fix: 'Give every page its own title.', ex: '',
  run(A) {
    if (!A.title) return NA('No title.');
    if (/^(home|untitled|blog|new post|page|post)$/i.test(A.title.trim())) return FAIL('Generic title', 'This title could belong to any page.');
    if (!(A.others || []).length) return NA('Add your other page titles under "Your other pages" to check for duplicates.');
    const me = new Set(stems(A.title));
    const dup = A.others.filter(o => !/^https?:/i.test(o)).map(o => ({ o, j: jaccard(me, new Set(stems(o))) })).filter(x => x.j >= 0.7);
    return dup.length ? FAIL(`${dup.length} very similar title(s)`, 'Titles with 70%+ of the same words.', dup.map(x => `"${x.o}"`)) : PASS('Unique among the titles you listed');
  } },
{ id: 54, cat: 'meta', name: 'Meta description length', m: 'M',
  fix: 'Write about 140–160 characters.', ex: '',
  run(A) {
    if (!A.desc) return FAIL('No meta description', 'Google will pick text from the page instead.');
    const L = A.desc.length, w = px(A.desc, '14px Arial'), v = `${L} characters · ${Math.round(w)}px`;
    if (L < 70) return FAIL(v, 'Too short to persuade.'); if (L < 120) return WARN(v, 'A bit short. Aim for 140–160.');
    if (w > 920 || L > 165) return WARN(v, 'Likely cut off in results.');
    return PASS(v);
  } },
{ id: 55, cat: 'meta', name: 'Meta description quality', m: 'M',
  fix: 'Include the keyword, a clear benefit and a call to action.', ex: '"Compare 9 AI SEO tools we tested on real sites. See pricing, pros and cons, and which fits your team."',
  run(A) {
    if (!A.desc) return NA('No meta description.');
    const d = A.desc.toLowerCase();
    const items = [['Includes keyword', !A.kwl || d.includes(A.kwl)], ['Has a call to action', /\b(learn|discover|get|try|find|see|check|start|download|compare|read|shop|book|explore|join|save|calculate)\b/.test(d)], ['Different from the title', d !== (A.title || '').toLowerCase()], ['No double quotes', !A.desc.includes('"')], ['Ends as a full sentence', /[.!?]$/.test(A.desc.trim())]];
    const n = items.filter(x => x[1]).length;
    return graded(n / items.length * 100, `${n} of ${items.length}`, items.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'), [], 80, 60);
  } },
{ id: 56, cat: 'meta', name: 'H1 optimization', m: 'M', crit: true,
  fix: 'Use exactly one H1 that states the topic and includes the keyword.', ex: '',
  run(A) {
    const h = A.h1s;
    if (!h.length) return A.page ? FAIL('No H1', 'The page has no H1 heading.') : WARN('No H1 in pasted text', 'Fine if WordPress prints the post title as the H1. Otherwise add one.');
    if (h.length > 1) return FAIL(`${h.length} H1 headings`, 'Use one H1 and H2/H3 for sections.', h.map(hloc));
    const kwIn = !A.kwl || countPhrase(h[0].text, A.kwl) > 0 || A.kwStems.every(s => stems(h[0].text).includes(s));
    return kwIn ? PASS(`"${cut(h[0].text, 60)}"`) : WARN('H1 does not include the keyword', `"${esc(h[0].text)}"`);
  } },
{ id: 57, cat: 'meta', name: 'H2 structure', m: 'M',
  fix: 'Add an H2 for each main section, about every 200–350 words.', ex: '',
  run(A) {
    if (A.N > 300 && !A.h2s.length) return FAIL('No H2 headings', 'Readers and search engines use H2s to understand sections.');
    const per = A.N / Math.max(1, A.h2s.length);
    return R(per <= 350 ? 'pass' : per <= 500 ? 'warn' : 'fail', `${A.h2s.length} H2 · ~${Math.round(per)} words each`, '', A.sections.filter(s => s.head && s.head.level === 2 && s.words > 450).map(s => `Long section: ${hloc(s.head)} (${s.words} words)`));
  } },
{ id: 58, cat: 'meta', name: 'H3 structure', m: 'M',
  fix: 'Use H3s only inside an H2 section, to split long sections.', ex: '',
  run(A) {
    const issues = []; let seenH2 = false;
    A.heads.forEach(h => { if (h.level === 2) seenH2 = true; if (h.level === 3 && !seenH2) issues.push('H3 before any H2: ' + hloc(h)); });
    A.sections.filter(s => s.head && s.head.level === 2 && s.words > 400 && !s.hasH3).forEach(s => issues.push(`${hloc(s.head)} has ${s.words} words and no H3s`));
    return R(issues.length === 0 ? 'pass' : 'warn', issues.length ? `${issues.length} issue(s)` : 'H3s are used correctly', '', issues);
  } },
{ id: 59, cat: 'meta', name: 'Heading relevance', m: 'E',
  fix: 'Make headings specific to the topic and under about 70 characters.', ex: '"Tips" → "5 Tips for Choosing an AI SEO Tool".',
  run(A) {
    const issues = [];
    A.subs.forEach(h => { if (!GENERIC_HEAD.test(h.text) && !stems(h.text).some(s => A.topic.has(s))) issues.push('Off-topic: ' + hloc(h)); if (h.text.length > 70) issues.push('Too long: ' + hloc(h)); });
    const t = A.heads.map(h => h.text.toLowerCase()); uniq(t.filter((x, i) => t.indexOf(x) !== i)).forEach(x => issues.push(`Duplicate heading: "${x}"`));
    return R(issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warn' : 'fail', `${issues.length} issue(s)`, 'Headings that share no topic words, run over 70 characters, or repeat.', issues);
  } },
{ id: 60, cat: 'meta', name: 'Heading hierarchy', m: 'M',
  fix: 'Do not skip levels (H2 → H4) and start with the H1.', ex: '',
  run(A) {
    const issues = [];
    if (A.heads.length && A.heads[0].level !== 1 && A.h1s.length) issues.push('The H1 is not the first heading');
    for (let i = 1; i < A.heads.length; i++) if (A.heads[i].level > A.heads[i - 1].level + 1) issues.push(`H${A.heads[i - 1].level} → H${A.heads[i].level}: "${cut(A.heads[i].text, 60)}"`);
    if (A.guessed) issues.push('Headings were guessed from short lines (no heading markup in the pasted text)');
    return R(issues.filter(x => !/guessed/.test(x)).length === 0 ? 'pass' : 'warn', issues.length ? `${issues.length} note(s)` : 'Logical order', '', issues);
  } },

/* ---------- 61–70 Links & images ---------- */
{ id: 61, cat: 'links', name: 'Internal link count', m: 'M',
  fix: 'Link to 2–5 related pages on your site with descriptive anchor text.', ex: '',
  run(A) { const n = A.intLinks.length; return R(n >= 2 ? 'pass' : n === 1 ? 'warn' : 'fail', `${n} internal link(s)`, A.host ? '' : 'Enter your domain so absolute links to your site count as internal.', A.intLinks.slice(0, 10).map(l => `"${cut(l.text, 50)}" → ${cut(l.abs, 80)}`)); } },
{ id: 62, cat: 'links', name: 'Internal link relevance', m: 'E',
  fix: 'Link to pages that continue the reader\'s task, with anchors that describe them.', ex: '',
  run(A) {
    if (!A.intLinks.length) return NA('No internal links found.');
    const good = A.intLinks.filter(l => { const w = words(l.text).length; return w >= 2 && w <= 10 && !/^(click here|here|read more|this|link|learn more)$/i.test(l.text) && (stems(l.text + ' ' + l.abs.replace(/[-_/]/g, ' ')).some(s => A.topic.has(s))); });
    const p = pct(good.length, A.intLinks.length);
    return graded(p, `${good.length} of ${A.intLinks.length} relevant`, 'Anchor text of 2–10 words that shares words with the topic.', A.intLinks.filter(l => !good.includes(l)).slice(0, 8).map(l => `"${l.text}" → ${cut(l.abs, 70)}`), 70, 40);
  } },
{ id: 63, cat: 'links', name: 'Broken internal links', m: 'M', crit: true,
  fix: 'Fix or remove links that return errors.', ex: '',
  run(A) { return linkResult(A, A.intLinks); } },
{ id: 64, cat: 'links', name: 'External link quality', m: 'E',
  fix: 'Cite original, credible sources (official docs, studies, government or university sites).', ex: '',
  run(A) {
    const ext = A.extLinks; if (!ext.length) return WARN('No external sources', 'Linking to credible sources supports trust.');
    const auth = ext.filter(l => AUTH_RE.test(l.host)), weak = ext.filter(l => /^http:/i.test(l.abs) || /(bit\.ly|tinyurl|t\.co|goo\.gl)/i.test(l.host));
    return R(auth.length && !weak.length ? 'pass' : 'warn', `${auth.length} of ${ext.length} from widely trusted sites`, 'Based on a list of well-known authoritative domains. Other sources may be fine but are not verified.', [...weak.map(l => 'Weak link (http or shortener): ' + l.abs), ...ext.slice(0, 8).map(l => (AUTH_RE.test(l.host) ? '✓ ' : '· ') + l.host)]);
  } },
{ id: 65, cat: 'links', name: 'Broken external links', m: 'M',
  fix: 'Replace dead sources with working ones.', ex: '',
  run(A) { return linkResult(A, A.extLinks); } },
{ id: 66, cat: 'links', name: 'Anchor text optimization', m: 'M',
  fix: 'Use anchor text that tells readers where the link goes.', ex: '"click here" → "our technical SEO checklist".',
  run(A) {
    if (!A.links.length) return NA('No links found.');
    const issues = [];
    A.links.forEach(l => { const t = l.text.trim(); if (!t) issues.push('Empty anchor (image link without alt?): ' + cut(l.abs, 70)); else if (/^(click here|here|read more|this|link|learn more|this link|more)$/i.test(t)) issues.push(`Generic: "${t}" → ${cut(l.abs, 60)}`); else if (/^https?:\/\//i.test(t)) issues.push('Naked URL as anchor: ' + cut(t, 70)); else if (words(t).length > 12) issues.push('Very long anchor: "' + cut(t, 70) + '"'); });
    if (A.kwl) { const exact = A.intLinks.filter(l => l.text.toLowerCase().trim() === A.kwl); if (exact.length > 2) issues.push(`${exact.length} internal links use the exact keyword as anchor`); }
    return R(issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warn' : 'fail', `${issues.length} issue(s) in ${A.links.length} links`, '', issues.slice(0, 12));
  } },
{ id: 67, cat: 'links', name: 'Image alt text', m: 'M',
  fix: 'Describe each meaningful image in 5–15 words. Use empty alt only for decorative images.', ex: 'alt="Ahrefs keyword explorer showing difficulty 32 for ai seo tools"',
  run(A) {
    if (!A.images.length) return NA('No images found in the content.');
    const missing = A.images.filter(i => i.alt === null), empty = A.images.filter(i => i.alt === ''), bad = A.images.filter(i => i.alt && (/\.(jpe?g|png|webp|gif)$/i.test(i.alt) || /^(img|image|dsc|photo)[-_ ]?\d+/i.test(i.alt)));
    const st = missing.length ? 'fail' : bad.length ? 'warn' : 'pass';
    return R(st, `${missing.length} missing · ${empty.length} decorative · ${bad.length} filename-like`, `${A.images.length} images checked.`, [...missing.map(i => 'No alt: ' + cut(i.src, 90)), ...bad.map(i => `Filename as alt "${i.alt}"`)].slice(0, 12));
  } },
{ id: 68, cat: 'links', name: 'Image relevance', m: 'E',
  fix: 'Use images that show the topic (screenshots, charts, real photos) and describe them.', ex: '',
  run(A) {
    if (!A.images.length) return A.N > 600 ? WARN('No images', 'Long articles usually benefit from screenshots, charts or diagrams.') : NA('No images found.');
    const rel = A.images.filter(i => stems((i.alt || '') + ' ' + (i.src || '').split('/').pop().replace(/[-_.]/g, ' ')).some(s => A.topic.has(s)));
    return graded(pct(rel.length, A.images.length), `${rel.length} of ${A.images.length} images relate to the topic`, 'Based on alt text and file names sharing topic words.', [], 60, 30);
  } },
{ id: 69, cat: 'links', name: 'Image file optimization', m: 'M',
  fix: 'Serve WebP or AVIF, set width and height, and lazy-load images below the fold.', ex: '<img src="chart.webp" width="800" height="450" loading="lazy" alt="…">',
  run(A) {
    if (!A.images.length) return NA('No images found.');
    const ext = i => ((i.src.split('?')[0].match(/\.([a-z0-9]{3,4})$/i) || [])[1] || '').toLowerCase();
    const old = A.images.filter(i => ['gif', 'bmp', 'tif', 'tiff'].includes(ext(i))), legacy = A.images.filter(i => ['jpg', 'jpeg', 'png'].includes(ext(i)));
    const issues = [...old.map(i => 'Heavy format: ' + cut(i.src, 80)), ...(legacy.length ? [`${legacy.length} JPG/PNG images could be WebP/AVIF`] : [])];
    if (A.page) { const unsized = A.images.filter(i => !i.width || !i.height); if (unsized.length) issues.push(`${unsized.length} images without width/height (can cause layout shift)`); const eager = A.images.slice(1).filter(i => i.loading !== 'lazy'); if (eager.length > 2) issues.push(`${eager.length} images below the first are not lazy-loaded`); }
    if (A.psi && A.psi.images) { const im = A.psi.images; if (im.optimized != null && im.optimized < 0.9) issues.push('PageSpeed: images could be compressed more'); if (im.responsive != null && im.responsive < 0.9) issues.push('PageSpeed: images are larger than needed'); }
    return R(old.length ? 'fail' : issues.length > 1 ? 'warn' : issues.length ? 'warn' : 'pass', issues.length ? `${issues.length} issue(s)` : 'Images look optimized', A.psi ? 'Includes Google PageSpeed image audits.' : 'From file formats and HTML attributes. File sizes need the PageSpeed key.', issues);
  } },
{ id: 70, cat: 'links', name: 'Image SEO (file names)', m: 'M',
  fix: 'Name files with descriptive, hyphenated words.', ex: 'IMG_4821.jpg → ai-seo-tool-dashboard.webp',
  run(A) {
    if (!A.images.length) return NA('No images found.');
    const bad = A.images.filter(i => { const f = decodeURIComponent((i.src.split('?')[0].split('/').pop() || '')).replace(/\.[a-z0-9]+$/i, ''); return /^(img|dsc|dscn|image|photo|pxl|screenshot|untitled|unnamed|download)[-_ ]?\d*/i.test(f) || /^[a-f0-9-]{16,}$/i.test(f) || /^\d+$/.test(f) || /_/.test(f) || words(f.replace(/-/g, ' ')).length < 2; });
    return R(bad.length === 0 ? 'pass' : bad.length <= A.images.length / 2 ? 'warn' : 'fail', `${A.images.length - bad.length} of ${A.images.length} descriptive`, '', bad.slice(0, 10).map(i => 'Rename: ' + cut(i.src.split('/').pop(), 80)));
  } },

/* ---------- 71–80 Technical ---------- */
{ id: 71, cat: 'tech', name: 'URL structure', m: 'M',
  fix: 'Use a short, lowercase, hyphenated slug with the keyword.', ex: '/blog/ai-seo-tools/',
  run(A) {
    if (!A.slugWords.length && !A.url) return NA('Enter the URL slug.');
    const issues = [], path = A.path || '/' + A.slug;
    if (/[A-Z]/.test(path)) issues.push('Uppercase letters'); if (/_/.test(path)) issues.push('Underscores (use hyphens)'); if (/[^a-zA-Z0-9\-/._~%]/.test(path)) issues.push('Special characters');
    if (A.query) issues.push('Query parameters in URL');
    if (A.slugWords.length > 6) issues.push(`${A.slugWords.length} words in slug (3–5 is ideal)`);
    const sw = A.slugWords.filter(w => STOP.has(w)); if (sw.length) issues.push('Stop words: ' + sw.join(', '));
    if (/(^|[-_/])(19|20)\d\d([-_/.]|$)/.test(path)) issues.push('Year or date in URL dates the page');
    if (path.split('/').filter(Boolean).length > 4) issues.push('Deep folder structure');
    if (A.kwl && !A.kwStems.every(s => A.slugWords.map(stem).includes(s))) issues.push('Keyword not in slug');
    return R(issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warn' : 'fail', cut(path, 70), '', issues);
  } },
{ id: 72, cat: 'tech', name: 'Canonical URL', m: 'M',
  fix: 'Add a self-referencing canonical tag with the full https URL.', ex: '<link rel="canonical" href="https://parix.ai/blog/ai-seo-tools/">',
  run(A) {
    if (!A.page) return NA(NOPAGE);
    const c = A.page.canonical; if (!c) return WARN('No canonical tag', 'Without it, Google picks the preferred URL itself.');
    if (!/^https?:\/\//i.test(c)) return WARN('Relative canonical: ' + c, 'Use the full absolute URL.');
    if (A.urlNorm && A.canonNorm !== A.urlNorm) return WARN('Points to another URL', `Canonical: ${esc(c)}. Google may index that URL instead of this one.`);
    return PASS('Self-referencing', esc(c));
  } },
{ id: 73, cat: 'tech', name: 'Indexability', m: 'M', crit: true,
  fix: 'Remove noindex and make sure the page returns status 200.', ex: '',
  run(A) {
    if (!A.page) return NA(NOPAGE);
    const r = A.page.robots || '', issues = [];
    if (A.live && A.httpStatus >= 400) return FAIL(`HTTP ${A.httpStatus}`, 'The page returns an error, so it cannot be indexed.');
    if (/noindex/.test(r)) return FAIL('noindex', 'The robots meta tag tells Google not to index this page.');
    if (/nofollow/.test(r)) issues.push('nofollow: links on this page pass no signals');
    if (A.live && A.finalUrl && normUrl(A.finalUrl) !== normUrl(A.url)) issues.push('Redirects to ' + A.finalUrl);
    return R(issues.length ? 'warn' : 'pass', issues.length ? `${issues.length} note(s)` : (A.live ? `HTTP ${A.httpStatus || 200} · indexable` : 'No noindex tag'), A.live ? '' : 'Status code needs Live URL mode.', issues);
  } },
{ id: 74, cat: 'tech', name: 'Robots.txt', m: 'M', crit: true,
  fix: 'Allow Googlebot to crawl this URL in robots.txt.', ex: '',
  run(A) {
    if (!A.live) return NA(NOLIVE);
    if (!A.robots) return NA('robots.txt could not be read: ' + esc(A.robotsErr || 'unknown error'));
    if (!A.robots.found) return PASS('No robots.txt', 'Without a robots.txt everything is crawlable.');
    return A.robots.blocked ? FAIL('Blocked by robots.txt', esc(A.robots.rule)) : PASS('Crawling allowed', A.robots.rule ? 'Matching rule: ' + esc(A.robots.rule) : 'No rule blocks this path.');
  } },
{ id: 75, cat: 'tech', name: 'XML sitemap', m: 'M',
  fix: 'Include the canonical URL in your XML sitemap.', ex: '',
  run(A) {
    if (!A.live) return NA(NOLIVE);
    if (!A.sitemap || !A.sitemap.found) return WARN('No sitemap found', 'Checked robots.txt, /sitemap_index.xml and /sitemap.xml.');
    const target = A.canonNorm || A.urlNorm, inMap = A.sitemap.urls.some(u => normUrl(u) === target);
    if (inMap) return PASS('URL is in the sitemap', `${A.sitemap.urls.length} URLs read from ${esc(A.sitemap.source)}.`);
    return WARN('URL not found in sitemap', `${A.sitemap.urls.length} URLs read from ${esc(A.sitemap.source)}${A.sitemap.partial ? ` (only 3 of ${A.sitemap.childCount} sitemap files were read, so it may be in another file)` : ''}.`);
  } },
{ id: 76, cat: 'tech', name: 'Schema markup', m: 'M',
  fix: 'Add Article or BlogPosting JSON-LD with headline, author, datePublished and image.', ex: '{"@type":"BlogPosting","headline":"…","author":{"@type":"Person","name":"…"},"datePublished":"2026-11-11"}',
  run(A) {
    if (!A.page) return NA(NOPAGE);
    const s = A.page.schema; if (!s.length) return WARN('No JSON-LD schema', 'Structured data helps search engines understand the page.');
    const broken = s.filter(x => !x.ok); const types = [];
    const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); if (o['@type']) types.push({ t: [].concat(o['@type']).join('/'), o }); if (o['@graph']) walk(o['@graph']); };
    s.filter(x => x.ok).forEach(x => walk(x.data));
    const art = types.find(x => /Article|BlogPosting|NewsArticle/.test(x.t));
    const issues = broken.map(b => 'Invalid JSON-LD: ' + b.error);
    if (art) ['headline', 'author', 'datePublished', 'image'].forEach(f => { if (!art.o[f]) issues.push(`${art.t} is missing "${f}"`); });
    else issues.push('No Article/BlogPosting type');
    return R(broken.length ? 'fail' : issues.length ? 'warn' : 'pass', 'Types: ' + (uniq(types.map(x => x.t)).join(', ') || 'none'), 'Read from JSON-LD on the page. Validate in Google\'s Rich Results Test for full detail.', issues);
  } },
{ id: 77, cat: 'tech', name: 'Mobile friendliness', m: 'M',
  fix: 'Add a responsive viewport meta tag and readable font sizes.', ex: '<meta name="viewport" content="width=device-width, initial-scale=1">',
  run(A) {
    if (!A.page) return NA(NOPAGE);
    const vp = A.page.viewport || '';
    if (!/width=device-width/.test(vp)) return FAIL('No responsive viewport', 'Without it, phones show a zoomed-out desktop page.');
    const issues = [];
    if (/user-scalable=no|maximum-scale=1(\.0)?\b/.test(vp)) issues.push('Zoom is disabled');
    if (A.psi) { if (A.psi.fontSize === 0) issues.push('PageSpeed: text too small on mobile'); if (A.psi.viewport === 0) issues.push('PageSpeed: viewport problem'); }
    return R(issues.length ? 'warn' : 'pass', issues.length ? `${issues.length} issue(s)` : 'Responsive viewport set', A.psi ? 'Includes Google PageSpeed mobile audits.' : 'Viewport tag only. Add a PageSpeed key for full mobile audits.', issues);
  } },
{ id: 78, cat: 'tech', name: 'Page loading speed', m: 'M',
  fix: 'Compress images, remove unused JavaScript and use caching or a CDN.', ex: '',
  run(A) {
    if (!A.live) return NA(NOLIVE);
    if (!A.psi) return NA(A.psiErr === 'needs-key' ? 'Google PageSpeed needs a free API key (shared quota is used up). Add it in Settings.' : 'PageSpeed did not run: ' + esc(A.psiErr || 'turned off in Settings.'));
    const p = A.psi.perf; return R(p >= 90 ? 'pass' : p >= 50 ? 'warn' : 'fail', `Performance ${p}/100 (mobile)`, `Lab: FCP ${(A.psi.lab.fcp / 1000).toFixed(1)}s · LCP ${(A.psi.lab.lcp / 1000).toFixed(1)}s · TBT ${Math.round(A.psi.lab.tbt)}ms. Google Lighthouse, mobile.`);
  } },
{ id: 79, cat: 'tech', name: 'Core Web Vitals', m: 'M',
  fix: 'Improve the failing metric: LCP (main image/server), INP (heavy JavaScript), CLS (sized images and ads).', ex: '',
  run(A) {
    if (!A.live) return NA(NOLIVE);
    if (!A.psi) return NA('Needs Google PageSpeed (see check 78).');
    const f = A.psi.field;
    if (f && (f.lcp || f.inp || f.cls != null)) {
      const r = [['LCP', f.lcp, 2500, 4000, v => (v / 1000).toFixed(1) + 's'], ['INP', f.inp, 200, 500, v => v + 'ms'], ['CLS', f.cls, 0.1, 0.25, v => v.toFixed(2)]].filter(x => x[1] != null);
      const poor = r.filter(x => x[1] > x[3]), ni = r.filter(x => x[1] > x[2] && x[1] <= x[3]);
      return R(poor.length ? 'fail' : ni.length ? 'warn' : 'pass', r.map(x => `${x[0]} ${x[4](x[1])}`).join(' · '), 'Real-user data (Chrome UX Report, 75th percentile).');
    }
    const l = A.psi.lab, bad = (l.lcp > 4000) + (l.cls > 0.25), mid = (l.lcp > 2500) + (l.cls > 0.1) + (l.tbt > 200);
    return R(bad ? 'fail' : mid ? 'warn' : 'pass', `Lab LCP ${(l.lcp / 1000).toFixed(1)}s · CLS ${(+l.cls).toFixed(2)} · TBT ${Math.round(l.tbt)}ms`, 'No real-user data for this URL yet, so these are lab estimates (TBT stands in for INP).');
  } },
{ id: 80, cat: 'tech', name: 'HTTPS security', m: 'M', crit: true,
  fix: 'Serve the page over HTTPS and load every resource over HTTPS.', ex: '',
  run(A) {
    if (!A.page || !A.url) return NA(NOPAGE);
    if (!/^https:/i.test(A.finalUrl || A.url)) return FAIL('Not HTTPS', 'Browsers mark HTTP pages as not secure.');
    return A.page.mixed.length ? WARN(`${A.page.mixed.length} insecure resource(s)`, 'Mixed content: loaded over http on an https page.', A.page.mixed.slice(0, 8)) : PASS('HTTPS, no mixed content');
  } },

/* ---------- 81–90 E-E-A-T ---------- */
{ id: 81, cat: 'eeat', name: 'Experience', m: 'E',
  fix: 'Show you have done this: what you tested, what happened, with photos or numbers.', ex: '"We tested 9 tools on 3 client sites for 30 days. Here is what changed."',
  run(A) { const n = A.exp.length; return R(n >= 3 ? 'pass' : n >= 1 ? 'warn' : 'fail', `${n} first-hand statement(s)`, 'Phrases like "we tested", "in my experience", "our results".', A.exp.slice(0, 6).map(sloc)); } },
{ id: 82, cat: 'eeat', name: 'Expertise', m: 'E',
  fix: 'Show credentials and depth: who wrote it, why they know, and detailed explanations.', ex: '',
  run(A) {
    const cred = /\b(certified|years of experience|PhD|MD|licensed|CPA|engineer|specialist|consultant|founder|lead|head of|manager|expert|degree)\b/i;
    const hasCred = cred.test(A.all) || (A.page && cred.test((A.page.bio || '') + ' ' + (A.page.authorEl || '')));
    const sc = (hasCred ? 35 : 0) + Math.min(35, A.extLinks.length * 12) + Math.min(30, A.numsPer300 * 12);
    return graded(Math.round(sc), `${Math.round(sc)}/100`, `Credentials ${hasCred ? 'found' : 'not found'}, ${A.extLinks.length} sources, ${A.nums} data points.`);
  } },
{ id: 83, cat: 'eeat', name: 'Authoritativeness', m: 'N', fix: 'Earn mentions and links from respected sites in your field.', ex: '',
  run() { return NA('Needs off-site data (backlinks, brand mentions, reviews) from Ahrefs, Semrush or Search Console. It cannot be measured from the article.'); } },
{ id: 84, cat: 'eeat', name: 'Trustworthiness', m: 'E',
  fix: 'Cite sources, show the author and date, and avoid exaggerated claims.', ex: '',
  run(A) {
    const items = [['Cites external sources', A.extLinks.length > 0], ['Names an author', A.sig.author], ['Shows a date', !!(A.page && (A.page.published || A.page.modified)) || /\b(updated|published)\b/i.test(A.all)], ['No unsupported strong claims', !A.supers.length]];
    if (A.page && A.url) items.push(['Served over HTTPS', /^https:/i.test(A.finalUrl || A.url)]);
    const n = items.filter(x => x[1]).length;
    return graded(n / items.length * 100, `${n} of ${items.length}`, items.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'), [], 75, 50);
  } },
{ id: 85, cat: 'eeat', name: 'Author information', m: 'M',
  fix: 'Show a byline with the author\'s name, linked to an author page.', ex: '"By Hafiz Panhwar, SEO & MarTech Executive"',
  run(A) {
    if (A.sig.author) return PASS('Author found', esc(A.sig.authorName || ''));
    return A.page ? WARN('No author found', 'No author meta tag, schema author or byline was found.') : WARN('No byline in the text', 'Add "By [name]". Ignore this if WordPress shows the author automatically.');
  } },
{ id: 86, cat: 'eeat', name: 'Author biography', m: 'M',
  fix: 'Add a short bio with relevant experience.', ex: '"Hafiz has run technical SEO for 40+ sites since 2021."',
  run(A) {
    const bio = A.page && A.page.bio ? A.page.bio : (A.heads.some(h => /about the author/i.test(h.text)) ? 'present' : '');
    if (bio && (bio === 'present' || words(bio).length >= 15)) return PASS('Bio found', bio === 'present' ? '' : `"${esc(cut(bio, 160))}"`);
    return WARN('No author bio', A.page ? 'No author box or "About the author" section was found.' : 'Add an "About the author" section, or check that your theme shows one.');
  } },
{ id: 87, cat: 'eeat', name: 'Source citations', m: 'M',
  fix: 'Link the original source next to each statistic or claim.', ex: '',
  run(A) {
    const e = A.extLinks.length, c = A.claims.length;
    if (!e && c) return FAIL(`${c} claims, 0 sources`, 'Statistics and studies are mentioned without any external link.');
    if (!e) return WARN('No sources cited');
    return R(c / e > 4 ? 'warn' : 'pass', `${e} source link(s) · ${c} claims`, '');
  } },
{ id: 88, cat: 'eeat', name: 'Research evidence', m: 'M',
  fix: 'Support key points with data from studies, surveys or your own research.', ex: '',
  run(A) {
    const stats = A.claims.length, cited = A.claims.filter(s => s.links).length;
    if (!stats) return WARN('No statistics or studies', 'Add data that backs up your main points.');
    return R(cited >= 1 && stats >= 2 ? 'pass' : 'warn', `${stats} data claims · ${cited} with a source`, '');
  } },
{ id: 89, cat: 'eeat', name: 'Site trust signals', m: 'M',
  fix: 'Link About, Contact and Privacy pages and add Organization schema.', ex: '',
  run(A) {
    if (!A.page) return NA(NOPAGE);
    const t = A.page.trust, org = A.page.schema.some(x => x.ok && /Organization|LocalBusiness/.test(JSON.stringify(x.data).slice(0, 50000)));
    const items = [['About page link', t.about], ['Contact page link', t.contact], ['Privacy policy link', t.privacy], ['Organization schema', org]];
    const n = items.filter(x => x[1]).length;
    return R(n >= 3 ? 'pass' : n === 2 ? 'warn' : 'fail', `${n} of 4`, items.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'));
  } },
{ id: 90, cat: 'eeat', name: 'YMYL sensitivity', m: 'E', crit: true,
  fix: 'For health, money, legal or safety topics: add an expert author, credentials and several authoritative sources.', ex: '',
  run(A) {
    const hay = [A.kwl, A.title, A.top.join(' ')].join(' ');
    const m = hay.match(YMYL_RE);
    if (!m) return PASS('Not a YMYL topic', 'No health, finance, legal or safety terms in the keyword, title or main topics.');
    const ok = A.sig.author && A.extLinks.filter(l => AUTH_RE.test(l.host)).length >= 2;
    return R(ok ? 'pass' : 'fail', `YMYL topic ("${m[0]}")`, ok ? 'Has an author and 2+ authoritative sources.' : 'Google holds these topics to a higher standard. Needs a named author and at least 2 authoritative sources.');
  } },

/* ---------- 91–100 Advanced ---------- */
{ id: 91, cat: 'adv', name: 'SERP competitor analysis', m: 'E',
  fix: 'Match the formats most top pages use.', ex: '',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    const feats = [['Tables', 'tables'], ['Lists', 'lists'], ['Question headings', 'questions'], ['Images', 'images']];
    const rows = feats.map(([n, k]) => { const share = A.comps.filter(c => c.stats[k] > 0).length / A.comps.length; return { n, share, mine: A.myStats[k] > 0 }; });
    const expected = rows.filter(r => r.share >= 0.5), missing = expected.filter(r => !r.mine);
    return R(missing.length === 0 ? 'pass' : missing.length === 1 ? 'warn' : 'fail', `${A.comps.length} competitor page(s) analysed`, rows.map(r => `${r.n}: ${Math.round(r.share * 100)}% of competitors · you ${r.mine ? '✓' : '✗'}`).join('<br>'), missing.map(r => `Most competitors use ${r.n.toLowerCase()}; you do not`));
  } },
{ id: 92, cat: 'adv', name: 'Content gap analysis', m: 'E',
  fix: 'Add the missing subtopics and terms where they help the reader.', ex: '',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    const n = A.missingTopics.length;
    return R(n <= 2 ? 'pass' : n <= 6 ? 'warn' : 'fail', `${n} missing subtopic(s) · ${A.semMissing.length} missing terms`, 'Missing terms: ' + (A.semMissing.slice(0, 12).map(esc).join(', ') || 'none'), A.missingTopics.slice(0, 12).map(t => `"${cut(t.text, 80)}" (${t.host})`));
  } },
{ id: 93, cat: 'adv', name: 'Featured snippet opportunity', m: 'E',
  fix: 'Under a question heading, answer in 40–60 words, or use a short list or table.', ex: 'H2 "What is an AI SEO tool?" followed by a 45-word definition.',
  run(A) {
    const found = [];
    A.blocks.forEach((b, i) => {
      if (b.type !== 'h' || b.level < 2) return; const nx = A.blocks[i + 1]; if (!nx || nx.type !== 'p') return;
      const isQ = /\?$|^(what|how|why|when|which|who)\b/i.test(b.text), w = words(nx.text).length;
      if (isQ && !nx.list && w >= 35 && w <= 65) found.push('Paragraph answer: ' + hloc(b));
      if (/^(how|steps|step-by-step)|\bsteps?\b|\bways?\b|\btips\b/i.test(b.text) && nx.list) found.push('List answer: ' + hloc(b));
    });
    if (A.tables) found.push(`${A.tables} table(s)`);
    return R(found.length ? 'pass' : 'warn', `${found.length} snippet-ready block(s)`, 'Formats Google often shows as featured snippets.', found.slice(0, 8));
  } },
{ id: 94, cat: 'adv', name: 'People Also Ask coverage', m: 'E',
  fix: 'Add question headings for related questions people search.', ex: '',
  run(A) {
    const n = A.qHeads.length, miss = A.compQuestions || [];
    const st = n >= 3 && miss.length <= 2 ? 'pass' : n >= 1 ? 'warn' : 'fail';
    return R(st, `${n} question heading(s)`, A.comps.length ? `${miss.length} competitor questions you do not answer.` : 'Look at "People also ask" in Google for your keyword and answer those questions.', miss.slice(0, 8).map(q => `"${q.text}" (${q.host})`));
  } },
{ id: 95, cat: 'adv', name: 'AEO readiness', m: 'E',
  fix: 'Answer the main question directly in the opening, define terms plainly, and use question headings with short answers.', ex: '"An AI SEO tool is software that… In short: …"',
  run(A) {
    const items = [['Direct answer in the first paragraph', A.sig.earlyAnswer], ['Plain definition sentence', A.sig.definition], ['Question headings', A.qHeads.length >= 2], ['Lists or tables', A.lists > 0 || A.tables > 0], ['Short paragraphs', A.paras.filter(p => words(p.text).length > 120).length === 0]];
    if (A.page) items.push(['Structured data', A.page.schema.length > 0]);
    const n = items.filter(x => x[1]).length;
    return graded(n / items.length * 100, `${n} of ${items.length}`, 'Answer-engine readiness: how easily AI search and assistants can quote a clear answer.<br>' + items.map(x => (x[1] ? '✓ ' : '✗ ') + x[0]).join('<br>'), [], 75, 50);
  } },
{ id: 96, cat: 'adv', name: 'GEO visibility', m: 'N', fix: 'Track whether AI assistants cite your page with a GEO monitoring tool.', ex: '',
  run() { return NA('Needs AI-search citation tracking data (how often ChatGPT, Gemini, Perplexity or AI Overviews cite you). No free reliable source exists.'); } },
{ id: 97, cat: 'adv', name: 'Entity optimization', m: 'E',
  fix: 'Name the specific tools, brands, people and standards involved, and explain them.', ex: '"Google Search Console", "Core Web Vitals", "Ahrefs"',
  run(A) {
    const mine = topN(A.entities, 12).map(x => x[0]);
    if (A.comps.length) { const miss = A.missingEntities; return R(miss.length <= 2 ? 'pass' : miss.length <= 6 ? 'warn' : 'fail', `${mine.length} entities · ${miss.length} competitor entities missing`, 'Yours: ' + (mine.map(esc).join(', ') || 'none'), miss.map(e => 'Competitors mention: ' + e)); }
    return R(mine.length >= 4 ? 'pass' : 'warn', `${mine.length} named entities`, 'Named things found: ' + (mine.map(esc).join(', ') || 'none') + '. Add competitor URLs to see which ones you miss.');
  } },
{ id: 98, cat: 'adv', name: 'Semantic relevance', m: 'E',
  fix: 'Cover the topic with the vocabulary top pages share.', ex: '',
  run(A) {
    if (A.comps.length) { const s = Math.round(A.semSim * 100); return graded(s, `${s}% similar to top pages' topic`, 'Cosine similarity between your word profile and the competitors\' combined word profile.', [], 50, 30); }
    if (!A.kwl) return NA('Enter a primary keyword or add competitor URLs.');
    const inTop = A.kwStems.filter(s => A.top.slice(0, 10).includes(s)).length / Math.max(1, A.kwStems.length) * 100;
    return graded(inTop, `${Math.round(inTop)}% of keyword words are main topics`, 'Without competitor pages, this checks that the keyword words rank among your most-used topic words.', [], 60, 30);
  } },
{ id: 99, cat: 'adv', name: 'Competitor content comparison', m: 'M',
  fix: 'Close the gaps where you fall below the competitor median.', ex: '',
  run(A) {
    if (!A.comps.length) return NA(NOCOMP);
    const L = { words: 'Words', h2: 'H2 sections', images: 'Images', lists: 'List items', tables: 'Tables', ext: 'External sources', numbers: 'Numbers/data', questions: 'Question headings' };
    const rows = Object.keys(L).map(k => ({ k, n: L[k], me: A.myStats[k], med: A.median[k], ok: A.myStats[k] >= A.median[k] * 0.8 }));
    const ok = rows.filter(r => r.ok).length;
    return graded(ok / rows.length * 100, `${ok} of ${rows.length} metrics at or near median`, 'Compared with the median of the competitor pages. See the Competitors tab for the full table.', rows.filter(r => !r.ok).map(r => `${r.n}: you ${r.me}, competitors ${Math.round(r.med)}`), 70, 45);
  } },
{ id: 100, cat: 'adv', name: 'Ranking opportunity assessment', m: 'E', late: true,
  fix: 'Fix critical issues first, then the categories with the lowest scores.', ex: '',
  run(A, res, interim) {
    let sc = interim;
    if (res[99] && res[99].s !== 'na') sc = sc * 0.7 + VAL[res[99].s] * 100 * 0.3;
    if (res[23] && res[23].s === 'fail') sc -= 10;
    const critFails = CHECKS.filter(c => c.crit && res[c.id] && res[c.id].s === 'fail').length;
    if (critFails) sc = Math.min(sc, 70);
    sc = Math.max(0, Math.min(100, Math.round(sc)));
    const lvl = sc >= 75 ? 'High' : sc >= 55 ? 'Medium' : 'Low';
    return R(sc >= 75 ? 'pass' : sc >= 55 ? 'warn' : 'fail', `${lvl} (${sc}/100)`, 'A rough estimate from this audit' + (A.comps.length ? ' and the competitor comparison' : '') + '. It does not include backlinks, domain strength or keyword difficulty, and it is not a ranking prediction.');
  } }
];

function normUrl(u) { try { const x = new URL(u); return (x.protocol + '//' + x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + x.search).toLowerCase(); } catch (e) { return String(u || '').toLowerCase(); } }
function ltLoc(m) { const c = m.context, t = c.text; return `${m.message}: "…${t.slice(Math.max(0, c.offset - 35), c.offset)}[${t.slice(c.offset, c.offset + c.length)}]${t.slice(c.offset + c.length, c.offset + c.length + 35)}…"` + ((m.replacements || []).length ? ' → ' + m.replacements.slice(0, 3).map(r => r.value).join(' / ') : ''); }
function linkResult(A, list) {
  if (!list.length) return NA('No links of this type found.');
  if (!A.linkStatus) return NA('Turn on "Check links" in Settings' + (A.mode === 'text' ? ' (links must be full https URLs)' : '') + '.');
  const checked = list.filter(l => A.linkStatus.has(l.abs));
  if (!checked.length) return NA('These links were not checked (limit of 12 per audit, or relative links without a domain).');
  const broken = checked.filter(l => { const s = A.linkStatus.get(l.abs).status; return s === 404 || s === 410 || s >= 500; });
  const unsure = checked.filter(l => { const s = A.linkStatus.get(l.abs).status; return s === 0 || s === 401 || s === 403 || s === 429; });
  const loc = [...broken.map(l => `HTTP ${A.linkStatus.get(l.abs).status}: ${l.abs}`), ...unsure.map(l => `Could not verify (${A.linkStatus.get(l.abs).status || 'no response'}; the site may block automated checks): ${l.abs}`)];
  return R(broken.length ? 'fail' : unsure.length ? 'warn' : 'pass', `${broken.length} broken of ${checked.length} checked`, `${list.length - checked.length} not checked (limit 12 per audit).`, loc);
}

/* ===== Run everything ===== */
function runAudit(A) {
  const s = A;
  s.flesch = 206.835 - 1.015 * (s.bw / s.sc) - 84.6 * (s.BW.reduce((a, w) => a + syl(w), 0) / s.bw);
  s.grade = 0.39 * (s.bw / s.sc) + 11.8 * (s.BW.reduce((a, w) => a + syl(w), 0) / s.bw) - 15.59;
  const first150 = s.BW.slice(0, 150).join(' ').toLowerCase();
  const authorName = (A.page && (A.page.author || A.page.authorEl)) || ((A.raw || '').match(/^\s*(?:by|written by|author:)\s+([A-Z][^\n]{2,60})/im) || [])[1] || '';
  s.sig = {
    steps: /\bstep\s*\d|\bstep-by-step\b/i.test(s.all) || s.ordered >= 3,
    definition: s.S.slice(0, 6).some(x => /\b(is|are|refers to|means)\b/i.test(x.t) && (!s.kwStems.length || s.kwStems.some(k => stems(x.t).includes(k)))),
    compare: /\bvs\.?\b|versus|compared|comparison|pros and cons|alternatives?/i.test(s.all),
    prices: /[$₹€£]\s?\d|\b(price|pricing|cost|per month|\/mo)\b/i.test(s.all),
    cta: /\b(buy|order|sign up|get started|try it|try for free|download|book a|contact us|subscribe|free trial|start now)\b/i.test(s.all),
    verdict: /\b(verdict|our pick|winner|we recommend|bottom line|best for|top pick)\b/i.test(s.all),
    trustWords: /\b(reviews?|guarantee|refund|secure|testimonials?|money-back)\b/i.test(s.all),
    earlyAnswer: !!s.kwStems.length && s.kwStems.every(k => stems(first150).includes(k)),
    author: !!authorName || !!(A.page && A.page.schema.some(x => x.ok && /"author"/.test(JSON.stringify(x.data).slice(0, 50000)))),
    authorName
  };
  const res = {};
  CHECKS.filter(c => !c.late).forEach(c => { try { res[c.id] = c.run(A, res); } catch (e) { res[c.id] = NA('This check hit an error: ' + esc(e.message)); console.error(c.id, e); } });
  let interim = scoreOf(res).total;
  CHECKS.filter(c => c.late).forEach(c => { try { res[c.id] = c.run(A, res, interim); } catch (e) { res[c.id] = NA('This check hit an error: ' + esc(e.message)); } });
  return { res, ...scoreOf(res) };
}
function scoreOf(res) {
  const cats = {}; let wSum = 0, tot = 0;
  CATS.forEach(c => {
    const L = CHECKS.filter(k => k.cat === c.id && res[k.id] && res[k.id].s !== 'na');
    const counts = { pass: 0, warn: 0, fail: 0, na: CHECKS.filter(k => k.cat === c.id && res[k.id] && res[k.id].s === 'na').length };
    L.forEach(k => counts[res[k.id].s]++);
    const sc = L.length ? Math.round(L.reduce((a, k) => a + VAL[res[k.id].s], 0) / L.length * 100) : null;
    cats[c.id] = { score: sc, counts, measured: L.length };
    if (sc !== null) { wSum += c.w; tot += sc * c.w; }
  });
  const critFails = CHECKS.filter(c => c.crit && res[c.id] && res[c.id].s === 'fail').length;
  const base = wSum ? tot / wSum : 0;
  return { cats, critFails, base: Math.round(base), total: Math.max(0, Math.round(base - critFails * 4)) };
}
