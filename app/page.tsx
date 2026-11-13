import { Demo } from "@/components/Demo";
import { Mark } from "@/components/Mark";
import { PublikPitch } from "@/components/PublikGate";

// The public landing page. The software is at /app.
export default function Home() {
  return (
    <>
      <nav className="l-nav" aria-label="Main">
        <a href="/" className="brand"><Mark /> blurt</a>
        <div className="row">
          <a className="plain hide-sm" href="#how">How it works</a>
          <a className="plain hide-sm" href="#compare">Compare</a>
          <a className="plain" href="https://github.com/VedSoni-dev/blurt" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a className="btn primary" href="/app">Open blurt</a>
        </div>
      </nav>

      <main>
        <section className="wrap hero">
          <div>
            <h1>Talk instead of type. Get text you can <em>send as is</em>.</h1>
            <p className="lede">Hold a key or a button, ramble, let go. blurt cuts the ums, applies your &ldquo;actually, no, Wednesday&rdquo;, adds the punctuation and puts it on your clipboard. In a browser tab, on your phone or your laptop.</p>
            <div className="row">
              <a className="btn primary big" href="/app">Open blurt →</a>
              <a className="btn ghost big" href="#how">How it works</a>
            </div>
            <p className="fact">Free, no weekly word limit, nothing to install. Open source.</p>
          </div>
          <Demo />
        </section>

        <section className="l-sec" id="how">
          <div className="wrap">
            <h2>Three steps, and the third is paste.</h2>
            <p className="sub">Talking is about four times faster than typing. blurt makes the talking come out the way you would have typed it.</p>
            <div className="steps">
              <div className="step"><p className="n">01</p><h3>Hold and talk</h3><p>Hold Space on a computer, or hold the big button on your phone. Your words show up live while you speak.</p></div>
              <div className="step"><p className="n">02</p><h3>Let go</h3><p>The fillers get struck out, your corrections win, lists become numbered lists. You see exactly what changed next to what you said.</p></div>
              <div className="step"><p className="n">03</p><h3>Paste it anywhere</h3><p>It&apos;s already copied. Slack, email, a doc, a prompt for ChatGPT or Claude. On a phone, share it straight to an app.</p></div>
            </div>
          </div>
        </section>

        <section className="l-sec">
          <div className="wrap">
            <h2>What it does, and what a browser tab can&apos;t.</h2>
            <div className="two">
              <div className="step">
                <h3>Works now</h3>
                <ul>
                  <li>Live words while you talk, in Chrome, Edge and Safari (desktop and phone)</li>
                  <li>Cleanup with AI, or a basic cleanup that runs right in the page</li>
                  <li>Styles: casual, neutral, formal, or a prompt for an AI</li>
                  <li>Your dictionary of names and jargon, and snippets (&ldquo;my email&rdquo; types your email)</li>
                  <li>History of every take, search, copy again, kept on your device</li>
                </ul>
              </div>
              <div className="step">
                <h3>Honest limits</h3>
                <ul>
                  <li>It can&apos;t type into other apps by itself. It copies; you paste.</li>
                  <li>Your browser&apos;s speech service hears the audio (Google&apos;s in Chrome, Apple&apos;s in Safari). The AI cleanup sends the text, never audio.</li>
                  <li>Firefox has no speech recognition: you can still paste text in and clean it.</li>
                  <li>Needs a connection. No offline mode yet.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="l-sec" id="compare">
          <div className="wrap">
            <h2>blurt next to Wispr Flow.</h2>
            <p className="sub">Wispr Flow is the polished paid app that types into any app on your computer. blurt is the free one that opens anywhere.</p>
            <table className="cmp">
              <thead><tr><th scope="col"></th><th scope="col">blurt</th><th scope="col">Wispr Flow</th></tr></thead>
              <tbody>
                <tr><td>Price</td><td>Free</td><td>$15/month, or $12/month yearly</td></tr>
                <tr><td>Free limit</td><td>None</td><td>2,000 words a week</td></tr>
                <tr><td>Install</td><td>No, a browser tab</td><td>App for Mac, Windows, iPhone, Android</td></tr>
                <tr><td>Types into other apps</td><td>No, you paste</td><td>Yes</td></tr>
                <tr><td>See what was changed</td><td>Yes, next to what you said</td><td>Not shown</td></tr>
                <tr><td>Source code</td><td>Open (MIT)</td><td>Closed</td></tr>
              </tbody>
            </table>
            <p className="cmp-src">Wispr Flow facts from wisprflow.ai and its pricing page, checked 13 Nov 2026. blurt is an independent project, not affiliated with Wispr.</p>
          </div>
        </section>

        <section className="l-sec" id="publik">
          <div className="wrap">
            <h2>Free, because of publik.</h2>
            <PublikPitch appName="blurt" />
          </div>
        </section>

        <section className="l-close">
          <div className="wrap">
            <h2>Say it messy. Send it clean.</h2>
            <div className="row"><a className="btn primary big" href="/app">Open blurt →</a></div>
          </div>
        </section>
      </main>

      <footer className="l-foot">
        <div className="wrap">
          <span>free &amp; open source · not affiliated with Wispr Flow</span>
          <span>built by <a href="https://x.com/forkthis_ai" target="_blank" rel="noopener noreferrer">@forkthis_ai</a> · <a href="https://github.com/VedSoni-dev/blurt" target="_blank" rel="noopener noreferrer">GitHub</a></span>
        </div>
      </footer>
    </>
  );
}
