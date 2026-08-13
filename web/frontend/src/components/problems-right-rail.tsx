import { MiniCalendar } from "@/components/mini-calendar";
import { StatusChart } from "@/components/status-chart";
import { RecentActivity } from "@/components/recent-activity";
import { Leaderboard } from "@/components/leaderboard";
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
      <Widget title="Recent Activity">
        <RecentActivity problems={problems} />
      </Widget>
      <Widget title="Leaderboard">
        <Leaderboard />
      </Widget>
    </div>
  );
}
