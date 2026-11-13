// Everything blurt keeps lives in this browser's localStorage: settings, your dictionary, snippets and history.
import type { Snippet } from "./rules.js";

export type Style = "casual" | "neutral" | "formal" | "prompt";
export interface Settings {
  style: Style;
  lang: string;
  terms: string[];
  snippets: Snippet[];
  ai: boolean;
  keep: "24h" | "7d" | "forever";
  anthropicKey: string;
  holdToTalk: boolean;
}
export interface Take {
  id: string;
  at: number;
  raw: string;
  clean: string | null;
  basic: string;
  cleanedBy: "ai" | "basic" | null;
  promptVersion: string;
  style: Style;
}

export const DEFAULTS: Settings = { style: "neutral", lang: "", terms: [], snippets: [], ai: true, keep: "forever", anthropicKey: "", holdToTalk: true };
const SK = "blurt.settings.v1", HK = "blurt.history.v1", OK = "blurt.onboarded.v1";

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

export const loadSettings = (): Settings => read(SK, DEFAULTS);
export const saveSettings = (s: Settings) => write(SK, s);

const MAX_AGE = { "24h": 864e5, "7d": 7 * 864e5, forever: Infinity } as const;
export function loadHistory(keep: Settings["keep"] = "forever"): Take[] {
  try {
    const v = JSON.parse(localStorage.getItem(HK) ?? "[]") as Take[];
    const now = Date.now();
    return Array.isArray(v) ? v.filter((t) => t && typeof t.raw === "string" && now - t.at < MAX_AGE[keep]) : [];
  } catch { return []; }
}
export const saveHistory = (h: Take[]) => write(HK, h.slice(0, 300));

export const isOnboarded = () => { try { return localStorage.getItem(OK) === "1"; } catch { return false; } };
export const setOnboarded = (v: boolean) => { try { v ? localStorage.setItem(OK, "1") : localStorage.removeItem(OK); } catch {} };

export function exportAll(): string {
  return JSON.stringify({ app: "blurt", version: 1, settings: { ...loadSettings(), anthropicKey: "" }, history: loadHistory() }, null, 2);
}
export function importAll(text: string): { ok: boolean; message: string } {
  try {
    const j = JSON.parse(text);
    if (j?.app !== "blurt") return { ok: false, message: "That file isn't a blurt export." };
    const cur = loadSettings();
    saveSettings({ ...DEFAULTS, ...j.settings, anthropicKey: cur.anthropicKey });
    const merged = [...(Array.isArray(j.history) ? j.history : []), ...loadHistory()];
    const seen = new Set<string>();
    saveHistory(merged.filter((t: Take) => t?.id && !seen.has(t.id) && seen.add(t.id)).sort((a: Take, b: Take) => b.at - a.at));
    return { ok: true, message: "Imported." };
  } catch {
    return { ok: false, message: "Couldn't read that file." };
  }
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
