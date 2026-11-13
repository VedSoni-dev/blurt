import Blurt from "@/components/Blurt";
import { PublikGate } from "@/components/PublikGate";
import "./app.css";

// The software lives here, behind Sign in with publik. The landing page at / is public.
export const metadata = { title: "blurt · talk, get clean text" };

export default function AppPage() {
  return (
    <PublikGate appName="blurt" tagline="Hold a key, ramble, get clean text on your clipboard." preview="/gate-preview.mp4">
      <Blurt />
    </PublikGate>
  );
}
