"use client";
// The landing page's pictures, all drawn from blurt's own UI and its own cleanup (lib/diff, the same word diff
// the app shows). Nothing here touches the microphone: the takes are scripted.
import { useEffect, useState } from "react";
import { wordDiff } from "@/lib/diff";
import { Mark } from "@/components/Mark";

const TAKES = [
  { raw: "um so can we meet tuesday actually no wednesday at 3", clean: "So can we meet Wednesday at 3?" },
  { raw: "hey uh i'm running like ten minutes late the the train is stuck sorry", clean: "Hey, I'm running ten minutes late. The train is stuck, sorry." },
  { raw: "for the launch we need first the video second the the landing page and third uh a post", clean: "For the launch we need:\n1. The video.\n2. The landing page.\n3. A post." },
];

const PAUSE_SVG = <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" /><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" /></svg>;
const PLAY_SVG = <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor" /></svg>;
const MIC = <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>;

export function DiffText({ raw, clean }: { raw: string; clean: string }) {
  return <>{wordDiff(raw, clean).map((p, i) => (p.t === "cut" ? <del key={i}>{p.w}</del> : p.t === "fixed" ? <ins key={i}>{p.w}</ins> : <span key={i}>{p.w}</span>))}</>;
}

/** The hero: blurt's window, a take arriving word by word while the mic is held, then its changes. */
export function HeroWindow() {
  const [k, setK] = useState(0);
  const [n, setN] = useState(0);
  const [stage, setStage] = useState<"talk" | "clean">("clean");
  const [running, setRunning] = useState(true);
  const take = TAKES[k];
  const words = take.raw.split(" ");

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false);
  }, []);
  useEffect(() => {
    if (!running) return;
    let t: ReturnType<typeof setTimeout>;
    if (stage === "talk") t = n < words.length ? setTimeout(() => setN(n + 1), 160) : setTimeout(() => setStage("clean"), 600);
    else t = setTimeout(() => { setK((k + 1) % TAKES.length); setN(0); setStage("talk"); }, 3800);
    return () => clearTimeout(t);
  }, [n, stage, k, words.length, running]);

  const talking = stage === "talk";
  return (
    <>
      <div className="ly-piece ly-piece--main bw" role="img" aria-label="blurt's window: a spoken take, 'um so can we meet tuesday actually no wednesday at 3', becomes 'So can we meet Wednesday at 3?' with the cut words struck through.">
        <div className="bw__bar" aria-hidden="true">
          <span className="bw__brand"><Mark size={18} />blurt</span>
          <span className="bw__chip">Neutral</span>
          <span className="bw__set">Settings</span>
        </div>
        <div className={`bw__pad${talking ? " is-live" : ""}`} aria-hidden="true">
          <div className="bw__head">
            <span className="bw__eyebrow">{talking ? "Listening · 0:04" : "Basic cleanup · copied"}</span>
            {talking ? <span className="bw__live"><span className="bw__meter is-on"><i /><i /><i /><i /><i /></span><span className="bw__mic is-on">{MIC}</span></span> : <span className="bw__seg"><i className="is-on">Changes</i><i>Clean</i><i>What you said</i></span>}
          </div>
          <p className="bw__text">
            {talking ? <>{words.slice(0, n).join(" ")}<span className="bw__interim">{n < words.length ? " …" : ""}</span></> : <DiffText raw={take.raw} clean={take.clean} />}
          </p>
        </div>
      </div>
      <button type="button" className={`ui-pause loop-pause bw__pause ${running ? "" : "is-paused"}`} aria-label={running ? "Pause animation" : "Play animation"} title={running ? "Pause animation" : "Play animation"} onClick={() => setRunning((r) => !r)}>
        {running ? PAUSE_SVG : PLAY_SVG}
      </button>
    </>
  );
}

/** The small card over the window's lower left: what happened when you let go. */
export function HeroCard() {
  return (
    <div className="ly-piece ly-piece--note bc" aria-hidden="true" data-ly-steps="700">
      <div className="bc__row"><b>Copied to clipboard</b><span className="bc__chip" data-step data-step-at="4">Ready to paste</span></div>
      <div className="bc__line" data-step><i>✓</i><span><b>um</b> and <b>actually no</b> cut</span></div>
      <div className="bc__line" data-step><i>✓</i><span><b>Tuesday</b> changed to Wednesday</span></div>
      <div className="bc__line" data-step><i>✓</i><span>Capital, question mark, <b>30 characters</b></span></div>
    </div>
  );
}

const HISTORY = [
  { t: "9:41", s: "basic", text: "So can we meet Wednesday at 3?" },
  { t: "9:38", s: "AI", text: "Hey, I'm running ten minutes late. The train is stuck, sorry." },
  { t: "9:20", s: "AI", text: "For the launch we need: the video, the landing page and a post." },
  { t: "9:02", s: "basic", text: "Can you send me the deck before the call?" },
  { t: "8:57", s: "AI", text: "Write a function that groups orders by week and sums the totals." },
  { t: "8:40", s: "basic", text: "Thanks, that works for me. See you Thursday." },
  { t: "8:31", s: "AI", text: "Remind Priya the invoice is due on the 20th." },
  { t: "8:12", s: "basic", text: "I'll be there in five." },
  { t: "8:05", s: "AI", text: "Book the Kubernetes review for Friday morning." },
  { t: "7:58", s: "basic", text: "Add oat milk and lemons to the list." },
];

const OPEN = {
  raw: "hey so um i wanted to say thanks for the the notes yesterday they helped a lot and uh can we can we push the review to thursday actually no friday morning",
  clean: "Hey, I wanted to say thanks for the notes yesterday. They helped a lot. Can we push the review to Friday morning?",
};

/** #cleanup: the history list beside the open take, as the app shows them. */
export function AppFrame() {
  return (
    <div className="ui app fill ba" role="img" aria-label="blurt's history of today's takes beside the open take: a spoken thank-you note with its fillers and repeats struck through and Thursday corrected to Friday.">
      <div className="app__pane ba__list">
        <div className="ba__head"><b>History</b><span>10</span></div>
        <p className="ba__day">Today</p>
        <ul>
          {HISTORY.map((h, i) => (
            <li key={i} className={i === 2 ? "is-on" : ""}>
              <span className="ba__txt">{h.text}</span>
              <span className="ba__meta">{h.t} · {h.s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="app__pane ba__open">
        <div className="ba__bar">
          <span className="ba__eyebrow">AI cleanup · copied</span>
          <span className="bw__seg"><i className="is-on">Changes</i><i>Clean</i><i>What you said</i></span>
        </div>
        <p className="ba__text"><DiffText raw={OPEN.raw} clean={OPEN.clean} /></p>
        <div className="ba__actions"><span className="ba__btn ba__btn--primary">Copy</span><span className="ba__btn">Share</span><span className="ba__btn ba__btn--ghost">Clean again</span></div>
        <p className="ba__where">Where your words go: your browser&apos;s speech service hears the audio; the cleanup sends text to publik. Nothing is stored on a server.</p>
      </div>
    </div>
  );
}

/** Card 1: one take in each of the four styles. */
export function StyleFragment() {
  return (
    <div className="ui bf" role="img" aria-label="The style switch set to Formal, and the same take written formally.">
      <b className="bf__title">Style</b>
      <span className="bf__seg"><i>Casual</i><i>Neutral</i><i className="is-on">Formal</i><i>AI prompt</i></span>
      <span className="bf__out">Could we move our meeting to Wednesday at 3 p.m.? Thank you.</span>
    </div>
  );
}

/** Card 2: the dictionary, with the terms only sent when a take uses them. */
export function DictFragment() {
  return (
    <div className="ui bf" role="img" aria-label="The dictionary with Priya, Siobhan, Next.js, Kubernetes and Supabase, and a take spelled with them.">
      <b className="bf__title">Dictionary</b>
      <span className="bf__chips"><i>Priya</i><i>Siobhan</i><i>Next.js</i><i>Kubernetes</i><i>Supabase</i></span>
      <span className="bf__out">Ask <ins>Siobhan</ins> to move the <ins>Next.js</ins> app to <ins>Supabase</ins>.</span>
    </div>
  );
}

/** Card 3: a snippet, said in two words. */
export function SnippetFragment() {
  return (
    <div className="ui bf" role="img" aria-label="A snippet: saying 'my calendar' types a booking link.">
      <b className="bf__title">Snippets</b>
      <span className="bf__snip"><span className="bf__say">my calendar</span><span className="bf__arrow">→</span><span className="bf__to">cal.com/priya/30min</span></span>
      <span className="bf__snip"><span className="bf__say">sign off</span><span className="bf__arrow">→</span><span className="bf__to">Thanks, talk soon. Priya</span></span>
      <span className="bf__out">Grab any slot here: <ins>cal.com/priya/30min</ins></span>
    </div>
  );
}

const SHORT = [
  { t: "9:41", text: "So can we meet Wednesday at 3?" },
  { t: "9:38", text: "I'll be there in five." },
  { t: "9:20", text: "Add oat milk and lemons." },
];

/** Card 4: the history, kept in this browser. */
export function HistoryFragment() {
  return (
    <div className="ui bf" role="img" aria-label="The history kept in this browser: three takes from today, with Keep history set to 7 days.">
      <span className="bf__h"><b className="bf__title">History</b><small>Kept 7 days</small></span>
      {SHORT.map((h, i) => (
        <span key={i} className="bf__row"><span>{h.text}</span><small>{h.t}</small></span>
      ))}
      <span className="bf__links"><i>Export</i><i>Import</i><i>Clear history</i></span>
    </div>
  );
}

/** #compare: the two side by side, as one panel. */
export function CompareFragment() {
  const rows = [
    ["Free limit", "None", "2,000 words a week"],
    ["Install", "A browser tab", "Mac, Windows, iPhone, Android apps"],
    ["Types into apps", "No, you paste", "Yes"],
    ["Shows its changes", "Yes", "No"],
    ["Source code", "Open, MIT", "Closed"],
  ];
  return (
    <div className="ui bf bf--cmp" role="img" aria-label="blurt compared with Wispr Flow: no word limit against 2,000 words a week, a browser tab against apps to install, you paste against typing into apps, its changes shown against not shown, open source against closed.">
      <span className="bf__cr bf__cr--head"><span><span className="sr-only">Feature</span></span><span>blurt</span><span>Wispr Flow</span></span>
      {rows.map(([f, a, b]) => (
        <span className="bf__cr" key={f}><span>{f}</span><span>{a}</span><span>{b}</span></span>
      ))}
    </div>
  );
}

/** #questions: the AI cleanup group from Settings, with where the key lives. */
export function AiFragment() {
  return (
    <div className="ui bf" role="img" aria-label="blurt's AI cleanup setting: rewrite with AI switched on, and an Anthropic key kept in this browser only.">
      <b className="bf__title">AI cleanup</b>
      <span className="bf__check"><i className="is-on">✓</i>Rewrite with AI after the basic cleanup</span>
      <span className="bf__key">sk-ant-••••••••••••••••</span>
      <span className="bf__note">Kept in this browser only and sent with each cleanup. Never stored on a server.</span>
    </div>
  );
}
