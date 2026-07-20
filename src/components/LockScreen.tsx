import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { biometricUnlock } from "@/lib/biometric";
import { Fingerprint } from "lucide-react";

/** Biometric gate over an existing session (mobile). */
export function LockScreen({
  onUnlock,
  onUsePassword,
}: {
  onUnlock: () => void;
  onUsePassword: () => void;
}) {
  const prompted = useRef(false);

  async function attempt() {
    if (await biometricUnlock()) onUnlock();
  }

  // Prompt immediately on mount (once — StrictMode double-invokes effects).
  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Calendar locked</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={attempt}>
            <Fingerprint /> Unlock
          </Button>
          <Button variant="outline" onClick={onUsePassword}>
            Use password instead
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
