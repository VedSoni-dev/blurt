"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublikChoice, usePublik } from "@/components/PublikGate";
import { ruleClean, applySnippets, applyDictionary, matchTerms, wordCount } from "@/lib/rules.js";
import { wordDiff } from "@/lib/diff";
import { LANGS, Take as Listening, speechSupport, type SpeechError } from "@/lib/speech";
import {
  DEFAULTS, exportAll, importAll, isOnboarded, loadHistory, loadSettings, saveHistory, saveSettings, setOnboarded, uid,
  type Settings, type Style, type Take,
} from "@/lib/store";
import { Mark } from "@/components/Mark";

type Phase = "idle" | "listening" | "cleaning" | "done";
const MAX_MS = 5 * 60_000, WARN_MS = 4.5 * 60_000;
const STYLE_LABEL: Record<Style, string> = { casual: "Casual", neutral: "Neutral", formal: "Formal", prompt: "AI prompt" };

const ERRORS: Record<SpeechError | "empty" | "offline", string> = {
  denied: "blurt can't hear you: the microphone is blocked for this site. Click the lock or settings icon next to the address, allow the microphone, then reload.",
  "no-mic": "No microphone found. Plug one in or check that no other app is using it, then try again.",
  network: "The browser's speech service couldn't be reached. Check your connection and try again.",
  unsupported: "This browser can't turn speech into text. Open blurt in Chrome, Edge or Safari, or type or paste below and blurt will still clean it up.",
  other: "Speech recognition stopped unexpectedly. Hold and try again.",
  empty: "Didn't catch anything. Hold and try again, a little closer to the mic.",
  offline: "You're offline. Speech recognition needs a connection; you can still paste text below.",
};

function sane(out: string, input: string) {
  const o = out.trim().replace(/^["“](.*)["”]$/s, "$1");
  if (!o) return null;
  if (o.length > input.length * 1.6 + 60) return null;
  if (/^(sure|here(?:'s| is)|certainly|i can|i'm sorry|as an ai)\b/i.test(o) && !/^(sure|here|certainly|i can|i'm sorry)/i.test(input.trim())) return null;
  return o;
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

const dayLabel = (t: number) => {
  const d = new Date(t), now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function Diff({ raw, clean, show }: { raw: string; clean: string; show: "diff" | "raw" | "clean" }) {
  const parts = useMemo(() => (show === "diff" ? wordDiff(raw, clean) : []), [raw, clean, show]);
  if (show === "raw") return <p className="text raw">{raw}</p>;
  if (show === "clean") return <p className="text">{clean}</p>;
  return (
    <p className="text">
      {parts.map((p, i) => (p.t === "cut" ? <del key={i}>{p.w}</del> : p.t === "fixed" ? <ins key={i}>{p.w}</ins> : <span key={i}>{p.w}</span>))}
    </p>
  );
}

export default function Blurt() {
  const { choice, pending } = usePublik();
  const [settings, setSettingsState] = useState<Settings>(DEFAULTS);
  const [history, setHistory] = useState<Take[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnb] = useState(true);
  const [support, setSupport] = useState({ stt: true, mic: true });
  const [phase, setPhase] = useState<Phase>("idle");
  const [finalText, setFinal] = useState("");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState<Take | null>(null);
  const [view, setView] = useState<"diff" | "raw" | "clean">("diff");
  const [note, setNote] = useState<{ text: string; topUp?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [sheet, setSheet] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const take = useRef<Listening | null>(null);
  const startedAt = useRef(0);
  const pressAt = useRef(0);
  const toggled = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const settingsRef = useRef(settings);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  phaseRef.current = phase;
  settingsRef.current = settings;

  useEffect(() => {
    const s = loadSettings();
    setSettingsState(s);
    setHistory(loadHistory(s.keep));
    setOnb(isOnboarded());
    setSupport(speechSupport());
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setIsTouch(typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches);
    setLoaded(true);
  }, []);

  const setSettings = (patch: Partial<Settings>) => {
    setSettingsState((s) => { const n = { ...s, ...patch }; saveSettings(n); return n; });
  };
  const updateHistory = useCallback((fn: (h: Take[]) => Take[]) => {
    setHistory((h) => { const n = fn(h); saveHistory(n); return n; });
  }, []);
  const flash = (t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const usePublikAi = choice === "publik" && !pending;
  const hasAi = settings.ai && (usePublikAi || !!settings.anthropicKey.trim());

  // ---- cleanup: basic instantly, then the AI with a timeout, sanity-checked; the take is saved before any network call
  const clean = useCallback(async (raw: string, existing?: Take) => {
    const s = settingsRef.current;
    const basic = ruleClean(raw, { terms: s.terms, snippets: s.snippets });
    const t: Take = existing
      ? { ...existing, basic, style: s.style }
      : { id: uid(), at: Date.now(), raw, basic, clean: null, cleanedBy: null, promptVersion: "1", style: s.style };
    updateHistory((h) => [t, ...h.filter((x) => x.id !== t.id)]);
    setCurrent(t);
    setView("diff");
    setNote(null);
    setCopied(await copyText(basic));

    const wantAi = s.ai && wordCount(raw) >= 4 && (usePublikAi || !!s.anthropicKey.trim());
    let final: Take = { ...t, clean: basic, cleanedBy: "basic" };
    if (wantAi) {
      setPhase("cleaning");
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 12_000);
      try {
        const res = await fetch("/api/clean", {
          method: "POST",
          headers: { "content-type": "application/json", ...(!usePublikAi && s.anthropicKey ? { "x-anthropic-key": s.anthropicKey.trim() } : {}) },
          body: JSON.stringify({ raw, style: s.style, terms: matchTerms(raw, s.terms) }),
          signal: ctl.signal,
        });
        const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string; topUpUrl?: string; promptVersion?: string };
        const ok = res.ok && body.text ? sane(body.text, raw) : null;
        if (ok) {
          const text = applySnippets(applyDictionary(ok, s.terms), s.snippets);
          final = { ...t, clean: text, cleanedBy: "ai", promptVersion: body.promptVersion ?? "1" };
          setCopied(await copyText(text));
        } else if (res.status === 402) {
          setNote({ text: body.error ?? "Your publik plan is out of credit.", topUp: body.topUpUrl });
        } else if (!res.ok) {
          setNote({ text: `${(body.error ?? "The AI didn't answer").replace(/[.!]?\s*$/, ".")} Showing basic cleanup.` });
        } else {
          setNote({ text: "The AI's answer didn't look like your words, so blurt kept the basic cleanup." });
        }
      } catch {
        setNote({ text: "The AI took too long. Showing basic cleanup; tap Clean again to retry." });
      } finally {
        clearTimeout(timer);
      }
    } else if (s.ai && wordCount(raw) >= 4) {
      setNote({ text: pending ? "Basic cleanup. Add your Anthropic key in Settings for the full AI rewrite." : "Basic cleanup. Turn on AI in Settings for the full rewrite." });
    }
    updateHistory((h) => h.map((x) => (x.id === final.id ? final : x)));
    setCurrent(final);
    setPhase("done");
    if (!isOnboarded()) { setOnboarded(true); setOnb(true); }
  }, [updateHistory, usePublikAi, pending]);

  useEffect(() => {
    if (copied) flash("Copied. Paste it anywhere");
  }, [copied, current?.clean]);

  // ---- listening
  const begin = useCallback(async () => {
    if (phaseRef.current === "listening" || phaseRef.current === "cleaning") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setError(ERRORS.offline); return; }
    setError(null); setNote(null); setFinal(""); setInterim(""); setElapsed(0); setCopied(null);
    const sup = speechSupport();
    if (!sup.stt) { setError(ERRORS.unsupported); setTyping(true); return; }
    const t = new Listening(settingsRef.current.lang, {
      onText: (f, i) => { setFinal(f); setInterim(i); },
      onLevel: setLevel,
      onError: (e) => {
        setError(ERRORS[e]);
        if (e !== "other") { take.current?.cancel(); take.current = null; setPhase("idle"); }
        if (e === "unsupported") setTyping(true);
      },
    });
    take.current = t;
    startedAt.current = Date.now();
    setPhase("listening");
    await t.start();
  }, []);

  const finish = useCallback(async () => {
    const t = take.current;
    if (!t || phaseRef.current !== "listening") return;
    take.current = null;
    const dur = Date.now() - startedAt.current;
    setPhase("cleaning");
    const raw = (await t.stop()).trim();
    setLevel(0);
    if (dur < 500 || !raw) { setPhase(current ? "done" : "idle"); setError(ERRORS.empty); return; }
    await clean(raw);
  }, [clean, current]);

  const cancel = useCallback(() => {
    take.current?.cancel();
    take.current = null;
    setLevel(0); setFinal(""); setInterim("");
    setPhase(current ? "done" : "idle");
  }, [current]);

  // timer, 5-minute cap
  useEffect(() => {
    if (phase !== "listening") return;
    const id = setInterval(() => {
      const e = Date.now() - startedAt.current;
      setElapsed(e);
      if (e >= MAX_MS) finish();
    }, 250);
    return () => clearInterval(id);
  }, [phase, finish]);

  // hold Space (when you're not typing in a field), Esc cancels
  useEffect(() => {
    const typingInField = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName));
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape" && phaseRef.current === "listening") { e.preventDefault(); cancel(); return; }
      if (e.code !== "Space" || sheet || typingInField(e)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (!settingsRef.current.holdToTalk && phaseRef.current === "listening") { finish(); return; }
      begin();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || sheet || typingInField(e)) return;
      e.preventDefault();
      if (settingsRef.current.holdToTalk) finish();
    };
    const hide = () => { if (document.visibilityState === "hidden" && phaseRef.current === "listening") finish(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); document.removeEventListener("visibilitychange", hide); };
  }, [begin, finish, cancel, sheet]);

  // the mic button: hold to talk, or a quick tap to start and another tap to stop
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (phaseRef.current === "listening") { toggled.current = false; finish(); return; }
    pressAt.current = Date.now();
    toggled.current = false;
    begin();
  };
  const onPointerUp = () => {
    if (phaseRef.current !== "listening") return;
    if (Date.now() - pressAt.current < 350 || !settings.holdToTalk) { toggled.current = true; return; }
    if (!toggled.current) finish();
  };

  const share = async (text: string) => {
    try { await navigator.share({ text }); } catch {}
  };
  const copyNow = async (text: string) => { const ok = await copyText(text); setCopied(ok); flash(ok ? "Copied. Paste it anywhere" : "Couldn't copy. Select the text and copy it by hand."); };

  const lastUnfinished = loaded && phase === "idle" && !current && history[0] && history[0].cleanedBy === null ? history[0] : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? history.filter((t) => (t.clean ?? t.basic ?? t.raw).toLowerCase().includes(q) || t.raw.toLowerCase().includes(q)) : history;
  }, [history, query]);
  const groups = useMemo(() => {
    const g: { day: string; items: Take[] }[] = [];
    for (const t of filtered) {
      const d = dayLabel(t.at);
      if (!g.length || g[g.length - 1].day !== d) g.push({ day: d, items: [] });
      g[g.length - 1].items.push(t);
    }
    return g;
  }, [filtered]);

  const listening = phase === "listening";
  const shownText = current?.clean ?? current?.basic ?? "";
  const bars = 5;

  return (
    <div className="app">
      <header className="top">
        <a href="/" className="brand" aria-label="blurt home"><Mark /> blurt</a>
        <div className="row">
          <span className="pill" title="Cleanup style">{STYLE_LABEL[settings.style]}</span>
          <button className="btn ghost" onClick={() => setSheet(true)}>Settings</button>
        </div>
      </header>

      <main className="col">
        {!onboarded && loaded && (
          <section className="card howto" aria-labelledby="howto-h">
            <h2 id="howto-h">Your first blurt</h2>
            <ol>
              <li><b>{isTouch ? "Hold the mic button" : "Hold Space"}</b> (or tap the mic once to start and again to stop). Your browser will ask for the microphone the first time.</li>
              <li><b>Talk like you'd talk.</b> Try: <q>um so can we meet Tuesday, actually no, Wednesday at 3</q></li>
              <li><b>Let go.</b> blurt cuts the ums, applies your correction, punctuates it and copies it. Paste it anywhere.</li>
            </ol>
            <div className="row">
              <span className="muted small">Pick how it should sound:</span>
              <div className="seg" role="group" aria-label="Style">
                {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
                  <button key={s} aria-pressed={settings.style === s} onClick={() => setSettings({ style: s })}>{STYLE_LABEL[s]}</button>
                ))}
              </div>
            </div>
          </section>
        )}

        {lastUnfinished && (
          <section className="card note-card">
            <p>Your last take didn&apos;t finish cleaning up.</p>
            <button className="btn" onClick={() => clean(lastUnfinished.raw, lastUnfinished)}>Finish it</button>
          </section>
        )}

        <section className={`card pad ${listening ? "is-live" : ""}`} aria-live="polite">
          {listening ? (
            <>
              <p className="eyebrow">Listening · {clock(elapsed)}{elapsed > WARN_MS ? " · stops at 5:00" : ""}</p>
              <p className="text live">
                {finalText}{finalText && interim ? " " : ""}<span className="interim">{interim}</span>
                {!finalText && !interim && <span className="interim">Start talking…</span>}
              </p>
            </>
          ) : current ? (
            <>
              <div className="pad-head">
                <p className="eyebrow">
                  {phase === "cleaning" ? <>Cleaning up<span className="dots" aria-hidden /></> : current.cleanedBy === "ai" ? "AI cleanup" : "Basic cleanup"}
                  {phase !== "cleaning" && copied ? " · copied" : ""}
                </p>
                <div className="seg small" role="group" aria-label="Show">
                  <button aria-pressed={view === "diff"} onClick={() => setView("diff")}>Changes</button>
                  <button aria-pressed={view === "clean"} onClick={() => setView("clean")}>Clean</button>
                  <button aria-pressed={view === "raw"} onClick={() => setView("raw")}>What you said</button>
                </div>
              </div>
              <Diff raw={current.raw} clean={shownText} show={view} />
              {note && (
                <p className="note" role="status">{note.text}{note.topUp && <> <a href={note.topUp} target="_blank" rel="noopener noreferrer">Top up on publik</a></>}</p>
              )}
              <div className="row actions">
                <button className={`btn ${copied === false ? "primary big" : ""}`} onClick={() => copyNow(shownText)}>Copy</button>
                {canShare && <button className="btn" onClick={() => share(shownText)}>Share</button>}
                <button className="btn ghost" disabled={phase === "cleaning"} onClick={() => clean(current.raw, current)}>Clean again</button>
              </div>
            </>
          ) : (
            <div className="empty">
              <p className="big-hint">{isTouch ? "Hold the button and talk." : <>Hold <kbd>Space</kbd> and talk.</>}</p>
              <p className="muted">Let go and the clean text is on your clipboard.</p>
            </div>
          )}
          {error && <p className="err" role="alert">{error}</p>}
        </section>

        <div className="row under">
          <button className="link" onClick={() => setTyping((v) => !v)}>{typing ? "Hide the text box" : "Type or paste instead"}</button>
          <span className="muted small">Where your words go: your browser&apos;s speech service hears the audio; the cleanup sends text to {usePublikAi ? "publik" : settings.anthropicKey ? "Anthropic, with your key" : "nobody (basic cleanup runs here)"}. Nothing is stored on a server.</span>
        </div>

        {typing && (
          <section className="card">
            <label className="field">
              <span>Paste or type something messy</span>
              <textarea rows={4} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="um so basically the thing is, the the launch moves to friday" />
            </label>
            <div className="row actions">
              <button className="btn primary" disabled={!typed.trim() || phase === "cleaning"} onClick={() => { clean(typed.trim()); setTyped(""); }}>Clean it up</button>
            </div>
          </section>
        )}

        <section className="history" aria-labelledby="hist-h">
          <div className="hist-head">
            <h2 id="hist-h">History <span className="muted">{history.length ? history.length : ""}</span></h2>
            {history.length > 3 && <input className="search" type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search history" />}
          </div>
          {!history.length && <p className="muted small">Every take lands here, on this device only. Nothing yet.</p>}
          {groups.map((g) => (
            <div key={g.day}>
              <p className="eyebrow day">{g.day}</p>
              <ul>
                {g.items.map((t) => <HistoryItem key={t.id} t={t} onCopy={copyNow} onClean={() => clean(t.raw, t)} onDelete={() => updateHistory((h) => h.filter((x) => x.id !== t.id))} />)}
              </ul>
            </div>
          ))}
        </section>
        <footer className="foot muted small">free &amp; open source · not affiliated with Wispr Flow · <a href="https://github.com/VedSoni-dev/blurt" target="_blank" rel="noopener noreferrer">code</a></footer>
      </main>

      <div className="micbar">
        <div className={`meter ${listening ? "on" : ""}`} aria-hidden>
          {Array.from({ length: bars }, (_, i) => (
            <i key={i} style={{ transform: `scaleY(${listening ? Math.max(0.15, Math.min(1, level * (1.4 - Math.abs(i - 2) * 0.25))) : 0.15})` }} />
          ))}
        </div>
        <button
          className={`mic ${listening ? "on" : ""}`}
          aria-label={listening ? "Stop and clean up" : "Hold to talk"}
          aria-pressed={listening}
          disabled={phase === "cleaning" || !loaded}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { if (phaseRef.current === "listening") finish(); }}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listening ? finish() : begin(); } }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </button>
        <p className="mic-hint">
          {phase === "cleaning" ? "Cleaning up…" : listening ? (isTouch ? "Let go (or tap) to finish" : "Let go to finish · Esc cancels") : isTouch ? "Hold to talk" : <>Hold <kbd>Space</kbd> or the button</>}
        </p>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}

      {sheet && (
        <SettingsSheet
          settings={settings}
          set={setSettings}
          pending={!!pending}
          onClose={() => setSheet(false)}
          onClear={() => { updateHistory(() => []); setCurrent(null); setPhase("idle"); }}
          onImported={() => { const s = loadSettings(); setSettingsState(s); setHistory(loadHistory(s.keep)); }}
          onReplayHowTo={() => { setOnboarded(false); setOnb(false); setSheet(false); }}
        />
      )}
      {!support.stt && loaded && !error && (
        <p className="sr-only" role="status">{ERRORS.unsupported}</p>
      )}
    </div>
  );
}

function HistoryItem({ t, onCopy, onClean, onDelete }: { t: Take; onCopy: (s: string) => void; onClean: () => void; onDelete: () => void }) {
  const [raw, setRaw] = useState(false);
  const text = t.clean ?? t.basic ?? t.raw;
  return (
    <li className="item">
      <p className={`text small-text ${raw ? "raw" : ""}`}>{raw ? t.raw : text}</p>
      <div className="row item-actions">
        <span className="muted tiny">{new Date(t.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {t.cleanedBy === "ai" ? "AI" : t.cleanedBy === "basic" ? "basic" : "not cleaned"}</span>
        <button className="link" onClick={() => onCopy(raw ? t.raw : text)}>Copy</button>
        <button className="link" onClick={() => setRaw((v) => !v)}>{raw ? "Clean" : "What you said"}</button>
        <button className="link" onClick={onClean}>Clean again</button>
        <button className="link danger" onClick={onDelete}>Delete</button>
      </div>
    </li>
  );
}

function SettingsSheet({ settings, set, pending, onClose, onClear, onImported, onReplayHowTo }: {
  settings: Settings; set: (p: Partial<Settings>) => void; pending: boolean; onClose: () => void; onClear: () => void; onImported: () => void; onReplayHowTo: () => void;
}) {
  const [terms, setTerms] = useState(settings.terms.join("\n"));
  const [snips, setSnips] = useState(settings.snippets.map((s) => `${s.cue} = ${s.text}`).join("\n"));
  const [msg, setMsg] = useState<string | null>(null);
  const { choice } = usePublik();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    ref.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const saveTerms = () => set({ terms: terms.split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 200) });
  const saveSnips = () => set({ snippets: snips.split("\n").map((l) => { const i = l.indexOf("="); return i > 0 ? { cue: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : null; }).filter((x): x is { cue: string; text: string } => !!x && !!x.cue && !!x.text).slice(0, 50) });

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportAll()], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `blurt-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    const r = importAll(await f.text());
    setMsg(r.message);
    if (r.ok) onImported();
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="set-h" ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id="set-h">Settings</h2>
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>

        <div className="group">
          <p className="label">Style</p>
          <div className="seg" role="group" aria-label="Style">
            {(Object.keys(STYLE_LABEL) as Style[]).map((s) => <button key={s} aria-pressed={settings.style === s} onClick={() => set({ style: s })}>{STYLE_LABEL[s]}</button>)}
          </div>
          <p className="muted small">{settings.style === "prompt" ? "Turns your ramble into clear instructions for ChatGPT, Claude and friends." : settings.style === "casual" ? "Relaxed, like a text to a friend." : settings.style === "formal" ? "Full sentences, no slang. Emails to people you don't know." : "Plain and clear. Good for most things."}</p>
        </div>

        <div className="group">
          <p className="label">AI cleanup</p>
          <label className="check"><input type="checkbox" checked={settings.ai} onChange={(e) => set({ ai: e.target.checked })} /> Rewrite with AI after the basic cleanup</label>
          {pending || choice === "own_key" ? (
            <label className="field">
              <span>Your Anthropic API key</span>
              <input className="mono" type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={settings.anthropicKey} onChange={(e) => set({ anthropicKey: e.target.value })} />
              <span className="muted small">Kept in this browser only and sent with each cleanup, never stored on a server. Without a key, blurt does the basic cleanup (fillers, corrections, punctuation) right here.</span>
            </label>
          ) : null}
          {!pending && <PublikChoice />}
        </div>

        <div className="group">
          <label className="field">
            <span>Language you speak</span>
            <select className="pick" value={settings.lang} onChange={(e) => set({ lang: e.target.value })}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={settings.holdToTalk} onChange={(e) => set({ holdToTalk: e.target.checked })} /> Hold to talk (off: Space and the button start and stop)</label>
        </div>

        <div className="group">
          <label className="field">
            <span>Dictionary</span>
            <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} onBlur={saveTerms} placeholder={"Names and words to spell right, one per line\nPriya\nNext.js\nKubernetes"} />
          </label>
        </div>
        <div className="group">
          <label className="field">
            <span>Snippets</span>
            <textarea rows={3} value={snips} onChange={(e) => setSnips(e.target.value)} onBlur={saveSnips} placeholder={"say this = to get this, one per line\nmy email = you@yourmail.com\nmy calendar = https://cal.com/you"} />
            <span className="muted small">Say the words on the left and blurt types the right side.</span>
          </label>
        </div>

        <div className="group">
          <label className="field">
            <span>Keep history</span>
            <select className="pick" value={settings.keep} onChange={(e) => set({ keep: e.target.value as Settings["keep"] })}>
              <option value="forever">Until I delete it</option>
              <option value="7d">7 days</option>
              <option value="24h">24 hours</option>
            </select>
          </label>
          <div className="row">
            <button className="btn" onClick={download}>Export</button>
            <label className="btn">Import<input type="file" accept="application/json,.json" hidden onChange={(e) => upload(e.target.files?.[0])} /></label>
            <button className="btn ghost" onClick={onReplayHowTo}>Show the how-to</button>
            <button className="btn ghost danger" onClick={() => { if (confirm("Delete every take in your history? This can't be undone.")) onClear(); }}>Clear history</button>
          </div>
          {msg && <p className="muted small" role="status">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
