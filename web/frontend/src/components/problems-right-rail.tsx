import { MiniCalendar } from "@/components/mini-calendar";

function PlaceholderCard({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Soon
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Nothing here yet.</p>
    </div>
  );
}

export function ProblemsRightRail({ today }: { today: Date }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <MiniCalendar today={today} />
      <PlaceholderCard title="Your activity" />
      <PlaceholderCard title="Announcements" />
    </div>
  );
}
