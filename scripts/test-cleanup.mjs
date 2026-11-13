// npm test: the basic cleanup against test/cleanup.fixtures.json (messy transcripts and what they should become).
import { readFileSync } from "node:fs";
import { ruleClean } from "../lib/rules.js";

const cases = JSON.parse(readFileSync(new URL("../test/cleanup.fixtures.json", import.meta.url), "utf8"));
let failed = 0;
for (const c of cases) {
  const got = ruleClean(c.raw, { terms: c.terms, snippets: c.snippets });
  if (got !== c.clean) {
    failed++;
    console.log(`FAIL  ${JSON.stringify(c.raw)}\n  want ${JSON.stringify(c.clean)}\n  got  ${JSON.stringify(got)}`);
  }
}
console.log(`cleanup fixtures: ${cases.length - failed}/${cases.length} pass`);
process.exit(failed ? 1 : 0);
