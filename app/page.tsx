import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

const DESCRIPTION =
  "Hold Space or the mic button and talk. blurt cuts the ums, applies your corrections, adds the punctuation and copies the text for you to paste anywhere. Free, open source, in a browser tab.";

// The landing page's own head, and the page type the taste kit reads (page-type, site-kind;
// <html data-type> is set by Landing's first script). The software is at /app.
export const metadata: Metadata = {
  title: "blurt: voice dictation for any browser tab",
  description: DESCRIPTION,
  openGraph: { title: "blurt: talk instead of type, in any browser tab", description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image" },
  other: { "page-type": "software", "site-kind": "software" },
};

export default function Home() {
  return <Landing />;
}
