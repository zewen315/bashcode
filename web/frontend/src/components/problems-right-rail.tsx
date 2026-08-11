import { MiniCalendar } from "@/components/mini-calendar";
import { StatusChart } from "@/components/status-chart";
import { Widget } from "@/components/widget";
import { type ProblemSummary } from "@/lib/api";

export function ProblemsRightRail({
  problems,
  today,
}: {
  problems: ProblemSummary[];
  today: Date;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Widget title="Your Status">
        <StatusChart problems={problems} />
      </Widget>
      <Widget>
        <MiniCalendar today={today} />
      </Widget>
    </div>
  );
}
