// Live speech-to-text in the browser (Web Speech API) plus a level meter from the mic.
// The browser's own speech service hears the audio (in Chrome, Google's; in Safari, Apple's); blurt never stores audio.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = any;

export function speechSupport(): { stt: boolean; mic: boolean } {
  if (typeof window === "undefined") return { stt: false, mic: false };
  const w = window as any;
  return { stt: !!(w.SpeechRecognition || w.webkitSpeechRecognition), mic: !!navigator.mediaDevices?.getUserMedia };
}

export type SpeechError = "denied" | "no-mic" | "network" | "unsupported" | "other";

export interface TakeCallbacks {
  onText: (finalText: string, interim: string) => void;
  onLevel: (level: number) => void;
  onError: (e: SpeechError, detail?: string) => void;
}

/** One take: start() when the key or button goes down, stop() when it comes up. */
export class Take {
  private rec: Rec = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private raf = 0;
  private finals: string[] = [];
  private interim = "";
  private live = false;
  private ended: Promise<void> | null = null;
  private resolveEnd: (() => void) | null = null;
  private wake: any = null;

  constructor(private lang: string, private cb: TakeCallbacks) {}

  get text() { return [...this.finals, this.interim].join(" ").replace(/\s+/g, " ").trim(); }

  async start() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { this.cb.onError("unsupported"); return; }
    this.live = true;
    this.ended = new Promise((r) => (this.resolveEnd = r));
    this.startRec(SR);
    this.startMeter();
    try { this.wake = await (navigator as any).wakeLock?.request("screen"); } catch {}
  }

  private startRec(SR: any) {
    const rec: Rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    if (this.lang) rec.lang = this.lang;
    const base = this.finals.length;
    rec.onresult = (e: any) => {
      const fin: string[] = [];
      let inter = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin.push(r[0].transcript.trim());
        else inter += r[0].transcript;
      }
      this.finals = [...this.finals.slice(0, base), ...fin];
      this.interim = inter.trim();
      this.cb.onText(this.finals.join(" "), this.interim);
    };
    rec.onerror = (e: any) => {
      const code = String(e?.error ?? "");
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") { this.live = false; this.cb.onError("denied"); }
      else if (code === "audio-capture") { this.live = false; this.cb.onError("no-mic"); }
      else if (code === "network") { this.live = false; this.cb.onError("network"); }
      else this.cb.onError("other", code);
    };
    rec.onend = () => {
      // Chrome ends a session on its own after a pause; while you're still holding, start again and keep the words.
      if (this.interim) { this.finals.push(this.interim); this.interim = ""; }
      if (this.live) { try { this.startRec(SR); return; } catch {} }
      this.resolveEnd?.();
    };
    this.rec = rec;
    try { rec.start(); } catch { /* already started */ }
  }

  private async startMeter() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!this.live) { this.stream.getTracks().forEach((t) => t.stop()); return; }
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx!.createMediaStreamSource(this.stream);
      const an = this.ctx!.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        this.cb.onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e: any) {
      if (e?.name === "NotAllowedError") { this.live = false; this.cb.onError("denied"); try { this.rec?.abort(); } catch {} }
      // no meter is fine otherwise: recognition may still work
    }
  }

  private release() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    try { this.wake?.release?.(); } catch {}
    this.wake = null;
    this.cb.onLevel(0);
  }

  /** Stop listening and wait (briefly) for the last words to land. */
  async stop(): Promise<string> {
    this.live = false;
    this.release();
    try { this.rec?.stop(); } catch {}
    await Promise.race([this.ended, new Promise((r) => setTimeout(r, 1500))]);
    return this.text;
  }

  cancel() {
    this.live = false;
    this.release();
    try { this.rec?.abort(); } catch {}
    this.resolveEnd?.();
  }
}

export const LANGS: { code: string; name: string }[] = [
  { code: "", name: "Browser default" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "en-IN", name: "English (India)" },
  { code: "es-ES", name: "Español" },
  { code: "es-MX", name: "Español (México)" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "fr-FR", name: "Français" },
  { code: "de-DE", name: "Deutsch" },
  { code: "it-IT", name: "Italiano" },
  { code: "nl-NL", name: "Nederlands" },
  { code: "hi-IN", name: "हिन्दी" },
  { code: "ja-JP", name: "日本語" },
  { code: "ko-KR", name: "한국어" },
  { code: "zh-CN", name: "中文 (简体)" },
];
