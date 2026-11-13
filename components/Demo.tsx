"use client";

import { useEffect, useState } from "react";
import { wordDiff } from "@/lib/diff";

// The landing page's example: a scripted take (no mic), the words arriving, then cleaning themselves up.
const TAKES = [
  { raw: "um so can we meet tuesday actually no wednesday at 3", clean: "So can we meet Wednesday at 3?" },
  { raw: "hey uh i'm running like ten minutes late the the train is stuck sorry", clean: "Hey, I'm running ten minutes late. The train is stuck, sorry." },
  { raw: "for the launch we need first the video second the the landing page and third uh a post", clean: "For the launch we need:\n1. The video.\n2. The landing page.\n3. A post." },
];

export function Demo() {
  const [k, setK] = useState(0);
  const [n, setN] = useState(0);
  const [stage, setStage] = useState<"talk" | "clean">("talk");
  const take = TAKES[k];
  const words = take.raw.split(" ");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(words.length); setStage("clean"); return; }
    let t: ReturnType<typeof setTimeout>;
    if (stage === "talk") {
      t = n < words.length ? setTimeout(() => setN(n + 1), 170) : setTimeout(() => setStage("clean"), 650);
    } else {
      t = setTimeout(() => { setK((k + 1) % TAKES.length); setN(0); setStage("talk"); }, 4200);
    }
    return () => clearTimeout(t);
  }, [n, stage, k, words.length]);

  const parts = stage === "clean" ? wordDiff(take.raw, take.clean) : [];
  return (
    <div className="demo" aria-label="Example: a spoken sentence turning into clean text">
      <p className="eyebrow"><span>{stage === "talk" ? "Listening" : "Cleaned up · copied"}</span><span>example</span></p>
      {stage === "talk" ? (
        <p className="text"><span>{words.slice(0, n).join(" ")}</span><span className="interim">{n < words.length ? " …" : ""}</span></p>
      ) : (
        <p className="text">{parts.map((p, i) => (p.t === "cut" ? <del key={i}>{p.w}</del> : p.t === "fixed" ? <ins key={i}>{p.w}</ins> : <span key={i}>{p.w}</span>))}</p>
      )}
      <div className="demo-foot">
        <span className={`demo-mic ${stage === "talk" ? "on" : ""}`} aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22"><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </span>
        <span className="muted small">{stage === "talk" ? "Holding space…" : "Let go. Paste it anywhere."}</span>
        <span className="demo-copied" style={{ opacity: stage === "clean" ? 1 : 0 }}>Copied</span>
      </div>
    </div>
  );
}
