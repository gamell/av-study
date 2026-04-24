import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline · Pilot Study",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        This page hasn&apos;t been cached yet. Your existing study progress, cards,
        and notes still work from the home screen — head back and continue
        studying.
      </p>
      <Link href="/">
        <Button>Back to home</Button>
      </Link>
    </main>
  );
}
