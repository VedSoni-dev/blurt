import Blurt from "@/components/Blurt";
import { PublikGate } from "@/components/PublikGate";

// The software lives here, behind Sign in with publik. The landing page at / is public.
export const metadata = { title: "blurt · talk, get clean text" };

export default function AppPage() {
  return (
    <PublikGate appName="blurt">
      <Blurt />
    </PublikGate>
  );
}
