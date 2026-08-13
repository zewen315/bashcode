"use client";

import { useState } from "react";
import { Coffee } from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COFFEE_URL = "https://buymeacoffee.com/bashcode";
const PRESET_AMOUNTS = [1, 3, 5, 10];

export default function DonatePage() {
  const [preset, setPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  function selectPreset(value: number) {
    setPreset(value);
    setCustomAmount("");
  }

  function handleCustomChange(value: string) {
    setCustomAmount(value);
    setPreset(null);
  }

  const customValue = Number(customAmount);
  const hasValidAmount = preset !== null || (customAmount.trim() !== "" && customValue > 0);

  function handleContinue() {
    window.open(COFFEE_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <main className="mx-auto flex max-w-md flex-col items-center gap-2 px-6 py-24 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Coffee className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold">Support BashCode</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          BashCode is free to use and always will be. It&apos;s a self-funded
          side project built and maintained by one person — if it&apos;s been
          useful to you, a small tip helps keep it running and growing.
          Thank you for even considering it.
        </p>

        <div className="grid w-full grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant={preset === amount ? "default" : "outline"}
              onClick={() => selectPreset(amount)}
            >
              ${amount}
            </Button>
          ))}
        </div>

        <div className="mt-3 flex w-full items-center gap-2">
          <div className="relative flex-1">
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground",
                !customAmount && "opacity-60",
              )}
            >
              $
            </span>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="Any amount"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              aria-label="Custom amount"
              className="pl-5"
            />
          </div>
        </div>

        <Button onClick={handleContinue} disabled={!hasValidAmount} className="mt-4 w-full">
          Continue to Buy Me a Coffee
        </Button>

        <p className="mt-2 text-xs text-muted-foreground">
          You&apos;ll choose or confirm the exact amount on the next step —
          BashCode doesn&apos;t handle payments directly.
        </p>
      </main>
      <Footer />
    </>
  );
}
