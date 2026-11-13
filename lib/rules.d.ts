export interface Snippet { cue: string; text: string }
export function ruleClean(raw: string, opts?: { terms?: string[]; snippets?: Snippet[] }): string;
export function applyDictionary(text: string, terms?: string[]): string;
export function applySnippets(text: string, snippets?: Snippet[]): string;
export function matchTerms(raw: string, terms?: string[], cap?: number): string[];
export function wordCount(s: string): number;
