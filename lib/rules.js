// blurt's basic cleanup: deterministic, instant, no network. It runs on every take before the AI
// (and is what you keep when the AI is off, slow or unavailable). Plain JS so `npm test` can run it
// in Node without a build step. Types: rules.d.ts.

const FILLERS = ["um+", "uh+m*", "erm+", "er+", "ah+", "hmm+", "mm+", "uh-huh"];
const FILLER_RE = new RegExp(`(^|[\\s,])(?:${FILLERS.join("|")})(?=[\\s,.?!]|$)[,]?`, "gi");
// "you know" as a filler, but not "do you know", "if you know", "you know what" asked as a question start.
const YOU_KNOW_RE = /(^|[\s,])(?<!\b(?:do|did|don't|if|what|whatever|as|you)\s)you know(?! (?:what|how|that|where|who|when|why|if|it|the|him|her|them|this))[,]?(?=[\s,.?!]|$)/gi;

const SPOKEN = [
  [/\s*\bnew paragraph\b\s*/gi, "\n\n"],
  [/\s*\bnew line\b\s*/gi, "\n"],
  [/\s*\bquestion mark\b/gi, "?"],
  [/\s*\bexclamation (?:mark|point)\b/gi, "!"],
  [/\s*\b(?:full stop|period)\b(?=\s|$)/gi, "."],
  [/\s*\bcomma\b/gi, ","],
  [/\s*\bcolon\b(?=\s|$)/gi, ":"],
];

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "today", "tomorrow", "tonight", "yesterday"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const NUMWORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "fifteen", "twenty", "thirty", "forty", "fifty", "hundred", "noon", "midnight"];
const bare = (w) => w.toLowerCase().replace(/[^a-z0-9':]/g, "");
function wordClass(w) {
  const b = bare(w);
  if (!b) return null;
  if (/^\d/.test(b) || NUMWORDS.includes(b)) return "num";
  if (WEEKDAYS.includes(b)) return "day";
  if (MONTHS.includes(b)) return "month";
  return null;
}

// Self-corrections. Strong cues always correct; weak cues ("I mean", "or rather") only when the words
// after them line up with something before (same word or same kind: a day, a number, a month).
const STRONG = ["scratch that", "actually no", "no actually", "no wait", "wait no", "sorry i mean", "no no", "oops i mean", "i meant"];
const WEAK = ["i mean", "or rather", "actually make that", "make that"];
const CUE_RE = new RegExp(`[,.]?\\s*\\b(${[...STRONG, ...WEAK].map((c) => c.replace(/ /g, "[,]?\\s+")).join("|")})\\b[,.]?\\s*`, "i");

const keep = (cue) => cue.trim().replace(/\s+/g, "\u0001");
function applyBacktracks(text) {
  for (let guard = 0; guard < 8; guard++) {
    const m = CUE_RE.exec(text);
    if (!m) break;
    const cue = m[1].toLowerCase().replace(/[,]/g, "").replace(/\s+/g, " ");
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    const strong = STRONG.includes(cue);
    if (cue === "scratch that") {
      // drop the sentence (or clause) that came before
      const cut = Math.max(before.lastIndexOf(". "), before.lastIndexOf("? "), before.lastIndexOf("! "), before.lastIndexOf("\n"));
      text = (cut >= 0 ? before.slice(0, cut + 1) + " " : "") + after;
      continue;
    }
    const pre = before.split(/\s+/).filter(Boolean);
    const post = after.split(/\s+/).filter(Boolean);
    if (!pre.length || !post.length) {
      text = strong ? `${before} ${after}` : `${before} ${keep(m[0])} ${after}`;
      continue;
    }
    const first = bare(post[0]);
    const cls = wordClass(post[0]);
    let at = -1;
    for (let i = pre.length - 1; i >= Math.max(0, pre.length - 8); i--) {
      if (bare(pre[i]) === first || (cls && wordClass(pre[i]) === cls)) { at = i; break; }
    }
    if (at < 0 && strong) at = pre.length - 1;
    if (at < 0) {
      // weak cue with nothing to line up with: it was just talk ("I mean, it's fine"); keep it
      text = `${before} ${keep(m[0])} ${after}`;
      continue;
    }
    // replace from the lined-up word to the cue; keep the replacement's unit ("at 2 ... at 3" → "at 3")
    text = [...pre.slice(0, at), ...post].join(" ");
  }
  return text.replace(/\u0001/g, " ");
}

// "first ... second ... third ..." → a numbered list, when at least two ordinals come in order.
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];
function applyLists(text) {
  const re = new RegExp(`\\b(?:number (one|two|three|four|five|six)|(${ORDINALS.join("|")})(?:ly)?)\\b[,:]?\\s+`, "gi");
  const hits = [...text.matchAll(re)];
  if (hits.length < 2) return text;
  const idx = (h) => (h[1] ? ["one", "two", "three", "four", "five", "six"].indexOf(h[1].toLowerCase()) : ORDINALS.indexOf(h[2].toLowerCase()));
  const seq = [];
  for (const h of hits) if (idx(h) === seq.length) seq.push(h);
  if (seq.length < 2) return text;
  const intro = text.slice(0, seq[0].index).trim().replace(/[,.]$/, "");
  const items = seq.map((h, i) => text.slice(h.index + h[0].length, i + 1 < seq.length ? seq[i + 1].index : undefined).trim().replace(/^and\s+/i, "").replace(/[,.;]?\s*(?:and)?\s*$/i, ""));
  const lines = items.map((it, i) => `${i + 1}. ${finishSentence(capitalize(it))}`);
  return (intro ? `${finishSentence(capitalize(intro)).replace(/[.]$/, ":")}\n` : "") + lines.join("\n");
}

const QUESTION_START = /^(who|what|when|where|why|how|which|whose|can|could|would|will|do|does|did|is|are|was|were|should|shall|may|might|have|has|am|isn't|aren't|don't|doesn't|won't|wouldn't|couldn't|shouldn't)\b/i;
const LEAD_IN = /^(?:(?:so|and|but|okay|ok|well|hey|oh|also|then|alright|right)[,]?\s+)+/i;
const capitalize = (s) => s.replace(/^(\s*)([a-z])/, (_, a, b) => a + b.toUpperCase());
function finishSentence(s) {
  s = s.trim();
  if (!s || /[.?!:;]$/.test(s)) return s;
  return s + (QUESTION_START.test(s.replace(LEAD_IN, "")) ? "?" : ".");
}

function tidy(text) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\s+([,.?!:;])/g, "$1")
    .replace(/([,.?!:;])(?=[A-Za-z])/g, "$1 ")
    .replace(/,{2,}/g, ",")
    .replace(/([.?!])[,.]+/g, "$1")
    .replace(/,([.?!])/g, "$1")
    .replace(/^[,.\s]+/, "")
    .replace(/[,\s]+$/, "")
    .trim();
}

const PROPER_RE = new RegExp(`\\b(?:${[...WEEKDAYS.slice(0, 7), ...MONTHS.filter((m) => m !== "may")].join("|")})\\b`, "g");
function caseSentences(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/(^|[.?!]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase()))
    .join("\n")
    .replace(/\bi\b/g, "I")
    .replace(/\bi'(m|ll|ve|d)\b/g, "I'$1")
    .replace(PROPER_RE, (w) => w[0].toUpperCase() + w.slice(1));
}

/** Spell names and jargon the way the person wrote them in their dictionary ("next js" → "Next.js"). */
export function applyDictionary(text, terms = []) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const list = terms.map((t) => String(t).trim()).filter(Boolean).slice(0, 200);
  if (!list.length) return text;
  const byNorm = new Map(list.map((t) => [norm(t), t]));
  const parts = text.split(/(\s+)/);
  const words = parts.filter((_, i) => i % 2 === 0);
  const out = [];
  for (let i = 0; i < words.length; ) {
    let done = false;
    for (let n = 3; n >= 1 && !done; n--) {
      if (i + n > words.length) continue;
      const chunk = words.slice(i, i + n);
      const lead = chunk[0].match(/^[^A-Za-z0-9]*/)[0];
      const trail = chunk[n - 1].match(/[^A-Za-z0-9]*$/)[0];
      const key = norm(chunk.join(""));
      if (key && byNorm.has(key)) { out.push(lead + byNorm.get(key) + trail); i += n; done = true; }
    }
    if (!done) { out.push(words[i]); i++; }
  }
  return out.join(" ");
}

/** Expand spoken cues into saved text ("my address" → the full address). Runs after cleanup. */
export function applySnippets(text, snippets = []) {
  for (const s of snippets) {
    const cue = String(s?.cue ?? "").trim();
    if (!cue || !s.text) continue;
    const re = new RegExp(`\\b${cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s,]+")}\\b`, "gi");
    text = text.replace(re, () => String(s.text));
  }
  return text;
}

/** The terms from a dictionary that appear (roughly) in a transcript: only these go to the AI. */
export function matchTerms(raw, terms = [], cap = 40) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const flat = norm(raw);
  const words = raw.toLowerCase().split(/\s+/).map(norm);
  return terms
    .map((t) => String(t).trim())
    .filter(Boolean)
    .filter((t) => {
      const n = norm(t);
      if (!n) return false;
      if (flat.includes(n)) return true;
      const head = n.slice(0, Math.max(3, Math.ceil(n.length * 0.6)));
      return words.some((w) => w.length >= 3 && (w.startsWith(head) || n.startsWith(w) && w.length >= n.length * 0.6));
    })
    .slice(0, cap);
}

/** The whole basic cleanup. */
export function ruleClean(raw, opts = {}) {
  let t = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  for (const [re, to] of SPOKEN) t = t.replace(re, to);
  t = t.replace(FILLER_RE, "$1").replace(YOU_KNOW_RE, "$1");
  // stutters: "the the", "I I"
  t = t.replace(/\b(\w+)(?:\s+\1\b)+/gi, "$1");
  t = applyBacktracks(t);
  t = tidy(t);
  t = applyLists(t);
  t = caseSentences(tidy(t));
  t = t.split("\n").map((line) => (/^\d+\. /.test(line) || !line.trim() ? line : finishSentence(capitalize(line)))).join("\n");
  t = applyDictionary(t, opts.terms);
  t = applySnippets(t, opts.snippets);
  return t.trim();
}

export function wordCount(s) {
  return String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
}
