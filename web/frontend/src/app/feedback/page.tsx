"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/footer";
import { sendFeedback } from "@/lib/api";

type Status = "idle" | "sending" | "sent" | "error";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, always empty for real users
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      await sendFeedback(message.trim(), email.trim(), website);
      setStatus("sent");
      setMessage("");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — try again shortly.");
    }
  }

  if (status === "sent") {
    return (
      <>
        <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-24 text-center">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <h1 className="text-xl font-semibold">Thanks for the feedback</h1>
          <p className="text-sm text-muted-foreground">It&apos;s on its way to support@bashcode.net.</p>
          <Link href="/problems" className="mt-2 text-sm text-foreground underline">
            Back to Problems
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-1 text-2xl font-semibold">Feedback</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Bug reports, feature requests, or anything else — this goes straight to support@bashcode.net.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="feedback-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-email" className="text-sm font-medium">
              Your email <span className="font-normal text-muted-foreground">(optional, if you want a reply)</span>
            </label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Honeypot: hidden from real users (off-screen, not display:none,
              so unsophisticated bots that skip hidden-element checks still
              fill it in), catches basic bots that fill every field blindly. */}
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <label htmlFor="feedback-website">Website</label>
            <input
              id="feedback-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={status === "sending" || !message.trim()} className="self-start">
            {status === "sending" ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      </main>
      <Footer />
    </>
  );
}
