"use client";
// The public front door at /: voice dictation in a browser tab. Built with the taste skill's kit (public/assets,
// loaded only here) and blurt's own colours; the plan is .taste-skill/plan.md.
// type: software (site-kind software)
// deal: hero collage, nav nav-centre, close close-type, footer footer-statement, rhythm surface-pairs, buttons solid,
//       blurt's own mark, lit ground sand, radius round, palette blurt's own (start.mjs brand), type instrument,
//       no effect (the live take is the hero's one moving thing)
// moments: marquee-row in #paste
// This component holds no state, so React never redraws the static markup the kit's scripts work on. The live
// parts keep their own state: the hero's window and the pending line.
import { useEffect, useState } from "react";
import { PublikPitch } from "@/components/PublikGate";
import { Mark } from "@/components/Mark";
import { HeroWindow, HeroCard, AppFrame, StyleFragment, DictFragment, SnippetFragment, HistoryFragment, CompareFragment, AiFragment } from "./Pieces";

const REPO = "https://github.com/VedSoni-dev/blurt";
const KIT_CSS = ["system.css", "ui/cards.css", "ui/base.css", "motion/motion.css", "backgrounds/backgrounds.css", "layout/layout.css", "moments/marquee-row/moment.css"];
const KIT_JS = ["system.js", "motion/motion.js", "layout/layout.js", "moments/moments.js"];
const HTML_ATTRS = `(function(){var d=document.documentElement;d.setAttribute('data-type','software');d.setAttribute('data-radius','round');d.setAttribute('data-ground','sand');d.setAttribute('data-buttons','solid');d.setAttribute('data-motion','');d.classList.add('m-enter','mo-js');setTimeout(function(){d.classList.add('m-enter-done')},700);setTimeout(function(){d.classList.add('mo-safe')},2500)})();`;

const ARROW = (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path className="m-arrow__stem" d="M1 6h8" /><path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
);

const PASTE_INTO = ["Slack", "Gmail", "Notion", "Google Docs", "WhatsApp", "iMessage", "Linear", "ChatGPT", "Claude", "Outlook", "Jira", "Telegram"];

function PublikPending() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    fetch("/api/publik/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setPending(j?.state === "pending")).catch(() => {});
  }, []);
  if (!pending) return null;
  return <p className="lp-pending">blurt is coming to publik (publik caps new listings each week). Until its listing is up, blurt is open to everyone with no sign-in, and the AI cleanup runs on your own key.</p>;
}

export function Landing() {
  useEffect(() => {
    for (const f of KIT_JS) {
      const src = `/assets/${f}`;
      if (document.querySelector(`script[src="${src}"]`)) continue;
      const s = document.createElement("script");
      s.type = "module";
      s.src = src;
      document.body.append(s);
    }
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HTML_ATTRS }} />
      {KIT_CSS.map((f) => (
        <link key={f} rel="stylesheet" href={`/assets/${f}`} precedence="taste-kit" />
      ))}
      <link rel="stylesheet" href="/assets/landing.css" precedence="taste-page" />

      <header className="nav nav--centre">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">Skip to content</a>
          <a className="nav__logo" href="#top"><span className="lp-mark"><Mark size={22} /></span>blurt</a>
          <nav className="nav__links" aria-label="Main">
            <div className="nav__item"><a className="nav__link" href="#cleanup">Cleanup</a></div>
            <div className="nav__item"><a className="nav__link" href="#features">Features</a></div>
            <div className="nav__item"><a className="nav__link" href="#compare">Compare</a></div>
            <div className="nav__item"><a className="nav__link" href="#questions">Questions</a></div>
          </nav>
          <div className="nav__actions">
            <a className="btn btn--primary" href="/app">Start dictating</a>
          </div>
          <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      <main id="top">
        {/* HERO: collage. The words left; blurt's window on the lit sand frame right, the Copied card over it. */}
        <section className="hero hero--collage" data-enter aria-labelledby="hero-h">
          <div className="wrap"><div className="hero-text grid hero__grid">
            <div className="hero__text span-5">
              <h1 id="hero-h">Voice dictation for any browser tab</h1>
              <p className="hero__lead">Hold Space or the mic button and talk. blurt cuts the ums, applies your corrections, adds the punctuation and copies the text for you to paste anywhere.</p>
              <div className="btn-row">
                <a className="btn btn--primary" href="/app">Start dictating{ARROW}</a>
                <a className="btn btn--secondary" href={REPO}>Read the source</a>
              </div>
              <p className="hero__proof">No weekly word cap. Chrome, Edge and Safari, on a phone or a laptop.</p>
            </div>
            <div className="hero__art span-6 start-7">
              <HeroWindow />
              <HeroCard />
            </div>
          </div></div>
        </section>

        {/* CLEANUP: app-frame. The h2 left, the line right, then history beside the open take. */}
        <section className="section" id="cleanup" aria-labelledby="cleanup-h">
          <div className="wrap">
            <div className="grid grid--top">
              <h2 id="cleanup-h" className="span-5">The change view marks every dictation edit</h2>
              <p className="t-lead muted span-6 start-7">
                Cut words are struck through and fixed ones underlined. Switch to Clean to copy, or to What you said to check what the browser heard. <a className="link" href="/app">Try a take</a>
              </p>
            </div>
            <AppFrame />
          </div>
        </section>

        {/* FEATURES: one 2x2 on the surface band, two screens */}
        <section className="section ground-surface" id="features" style={{ "--h": 2 } as React.CSSProperties} aria-labelledby="features-h">
          <div className="wrap">
            <div className="group">
              <div className="section-head">
                <h2 id="features-h">
                  What blurt does with a take. <span className="muted">Your settings and history stay in this browser.</span>
                </h2>
                <a className="link" href="/app">Open the settings in blurt</a>
              </div>
              <div className="grid">
                <article className="card card--row card--open span-6 m-nolift">
                  <h3>Four dictation styles</h3>
                  <p>Casual, neutral, formal, or a clear prompt for ChatGPT or Claude.</p>
                  <div className="panel"><div className="stage stage--fade-b">
                    <div className="at-rise fit" style={{ "--fit-max": "360px", "--ax": "max(24px, 50% - 180px)", "--ay": "48px", "--ay-sm": "24px" } as React.CSSProperties}>
                      <StyleFragment />
                    </div>
                  </div></div>
                </article>
                <article className="card card--row card--open span-6 m-nolift">
                  <h3>Dictation that spells your names</h3>
                  <p>Add a name or a bit of jargon once. Only the words a take uses go to the AI.</p>
                  <div className="panel"><div className="stage stage--fade-b">
                    <div className="at-rise fit" style={{ "--fit-max": "360px", "--ax": "max(24px, 50% - 180px)", "--ay": "48px", "--ay-sm": "24px" } as React.CSSProperties}>
                      <DictFragment />
                    </div>
                  </div></div>
                </article>
                <article className="card card--row card--open span-6 m-nolift">
                  <h3>Voice snippets for links and sign-offs</h3>
                  <p>Say &ldquo;my calendar&rdquo; and blurt puts in your booking link.</p>
                  <div className="panel"><div className="stage stage--fade-b">
                    <div className="at-rise fit" style={{ "--fit-max": "360px", "--ax": "max(24px, 50% - 180px)", "--ay": "48px", "--ay-sm": "24px" } as React.CSSProperties}>
                      <SnippetFragment />
                    </div>
                  </div></div>
                </article>
                <article className="card card--row card--open span-6 m-nolift">
                  <h3>History on this device</h3>
                  <p>Saved before any network call. Search it, export it, or let it clear after 24 hours.</p>
                  <div className="panel"><div className="stage stage--fade-b">
                    <div className="at-rise fit" style={{ "--fit-max": "360px", "--ax": "max(24px, 50% - 180px)", "--ay": "48px", "--ay-sm": "24px" } as React.CSSProperties}>
                      <HistoryFragment />
                    </div>
                  </div></div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* PASTE: the three moves in rows, then the marquee-row of the apps people paste into */}
        <section className="section" id="paste" aria-labelledby="paste-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="paste-h">How it works: hold, let go, paste</h2>
                <p className="t-lead">Talking runs about four times faster than typing. blurt makes the talking come out the way you would have typed it.</p>
              </div>
              <ul className="rows span-6 start-7">
                <li><span className="rows__name">Hold</span><p>Hold Space on a laptop, or the big button on a phone. Your words show up while you talk.</p></li>
                <li><span className="rows__name">Let go</span><p>Fillers go, your &ldquo;actually, no, Wednesday&rdquo; wins, and a spoken list becomes a numbered one.</p></li>
                <li><span className="rows__name">Paste</span><p>The text is already on your clipboard. On a phone, the share sheet sends it to an app.</p></li>
              </ul>
            </div>
            <div className="lp-row">
              <p className="t-label">Paste it into</p>
              <div data-moment="marquee-row" data-moment-opts='{"speed": 36}'>
                <ul className="mo-mq__track">{PASTE_INTO.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARE: split-text-left, the comparison as one panel on the lit ground */}
        <section className="section" id="compare" aria-labelledby="compare-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="compare-h">Comparison: blurt and Wispr Flow</h2>
                <p className="t-lead">Wispr Flow types straight into other apps, at $15 a month after 2,000 free words a week. blurt is a free tab on any device.</p>
                <p className="t-small muted">Wispr Flow facts from wisprflow.ai, checked 13 November 2026. blurt is not affiliated with Wispr.</p>
              </div>
              <div className="frame frame--lit lp-panel span-6 start-7"><CompareFragment /></div>
            </div>
          </div>
        </section>

        {/* QUESTIONS: every answer open, the limits said plainly; the publik pitch beside them */}
        <section className="section" id="questions" aria-labelledby="questions-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="questions-h">Questions</h2>
                <PublikPitch appName="blurt" className="lp-pitch" />
                <PublikPending />
                <div className="frame frame--lit lp-panel lp-panel--ai"><AiFragment /></div>
              </div>
              <div className="faq span-6 start-7">
                <div className="faq__item">
                  <h3>Can blurt type into other apps?</h3>
                  <p>No. A web page can&apos;t reach into other apps, so blurt copies the text and you paste it. There is no browser extension yet.</p>
                </div>
                <div className="faq__item">
                  <h3>Where does my voice go?</h3>
                  <p>Your browser&apos;s speech service hears the audio: Google&apos;s in Chrome, Apple&apos;s in Safari. The AI cleanup gets the text, never audio. History stays in this browser.</p>
                </div>
                <div className="faq__item">
                  <h3>Which browsers can I talk in?</h3>
                  <p>Chrome, Edge and Safari, on a laptop or a phone. Firefox has no speech recognition, so there you paste text in and blurt cleans it.</p>
                </div>
                <div className="faq__item">
                  <h3>Does the dictation work without AI?</h3>
                  <p>Yes. A basic cleanup runs in the page: fillers, repeats, corrections, punctuation and numbered lists. It needs a connection for speech.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer closing footer--statement" id="contact" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--type">
            <div className="section-head">
              <h2 id="close-h">Say it messy, send it clean</h2>
              <p>Free and MIT licensed. Nothing to install: sign in with a free publik account and start talking.</p>
            </div>
            <a className="btn btn--primary btn--xl btn--wide" href="/app">Start dictating{ARROW}</a>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <a className="nav__logo" href="#top"><span className="lp-mark"><Mark size={22} /></span>blurt</a>
                <p className="footer__lede">Talk instead of type, in a browser tab, and paste clean text anywhere.</p>
              </div>
              <div className="span-2 footer__col">
                <h3>blurt</h3>
                <ul>
                  <li><a href="#cleanup">Cleanup</a></li>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#paste">How it works</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Help</h3>
                <ul>
                  <li><a href="#questions">Questions</a></li>
                  <li><a href={`${REPO}/issues`}>Issues</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Code</h3>
                <ul>
                  <li><a href={REPO}>Read the source</a></li>
                  <li><a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>More</h3>
                <ul>
                  <li><a href="https://publikhq.com">publik</a></li>
                  <li><a href="https://x.com/forkthis_ai">@forkthis_ai</a></li>
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>&copy; 2026 blurt. Not affiliated with Wispr Flow.</span>
              <div className="socials" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
