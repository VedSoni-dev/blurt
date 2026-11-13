// Word-level diff of what you said against what blurt wrote: "cut" words were removed, "fixed" words are new or changed.
export type Part = { t: "same" | "cut" | "fixed"; w: string };

const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

export function wordDiff(raw: string, clean: string): Part[] {
  const a = raw.split(/\s+/).filter(Boolean);
  const b = clean.split(/(\s+)/).filter((x) => x !== "");
  const bw = b.filter((x) => !/^\s+$/.test(x));
  const n = a.length, m = bw.length;
  if (n * m > 400_000) return [{ t: "fixed", w: clean }];
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = key(a[i]) && key(a[i]) === key(bw[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Part[] = [];
  let i = 0, j = 0;
  // walk the clean text in order (keeping its line breaks), slotting cut words where they were
  const push = (p: Part) => out.push(p);
  let bi = 0;
  const nextWord = () => {
    // emit whitespace tokens of b until the next word
    while (bi < b.length && /^\s+$/.test(b[bi])) { push({ t: "same", w: b[bi] }); bi++; }
  };
  while (i < n || j < m) {
    if (i < n && j < m && key(a[i]) && key(a[i]) === key(bw[j])) {
      nextWord(); push({ t: "same", w: b[bi] }); bi++; i++; j++;
    } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) {
      nextWord(); push({ t: "fixed", w: b[bi] }); bi++; j++;
    } else {
      nextWord(); push({ t: "cut", w: a[i] }); push({ t: "same", w: " " }); i++;
    }
  }
  while (bi < b.length) { push({ t: "same", w: b[bi] }); bi++; }
  return out;
}
