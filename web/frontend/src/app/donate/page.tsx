import { Coffee } from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

const COFFEE_URL = "https://buymeacoffee.com/bashcode";

export default function DonatePage() {
  return (
    <>
      <main className="mx-auto flex max-w-md flex-col items-center gap-2 px-6 py-24 text-center">
        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Coffee className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold">Support BashCode</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          BashCode is free to use and always will be. It&apos;s a self-funded
          side project built and maintained by one person — if it&apos;s been
          useful to you, a tip of anywhere from $1 to $10 is great, and helps
          keep it running and growing. Thank you for even considering it.
        </p>

        <Button
          render={<a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
          className="w-full"
        >
          Buy Me a Coffee
        </Button>
      </main>
      <Footer />
    </>
  );
}
