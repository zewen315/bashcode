import ReactMarkdown from "react-markdown";
import { type ProblemDetail } from "@/lib/api";

export function ProblemSolution({ problem }: { problem: ProblemDetail }) {
  return (
    <div className="px-5 py-4">
      <article className="text-sm leading-6 text-foreground [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:py-0.5 [&_h1]:hidden [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mb-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown>{problem.solution_explanation}</ReactMarkdown>
      </article>
    </div>
  );
}
