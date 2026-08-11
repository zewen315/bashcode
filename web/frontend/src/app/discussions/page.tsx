import { Footer } from "@/components/footer";

export default function DiscussionsPage() {
  return (
    <>
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-6 py-24 text-center">
        <h1 className="text-lg font-semibold">Discussions</h1>
        <p className="text-sm text-muted-foreground">
          Coming soon — a place to talk through approaches once there are enough
          problems (and people) to make it worth building.
        </p>
      </main>
      <Footer />
    </>
  );
}
