import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { difficultyColor } from "@/lib/difficulty";
import { type ProblemDetail } from "@/lib/api";

export function ProblemDescription({ problem }: { problem: ProblemDetail }) {
  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-lg font-semibold">
          {problem.id}. {problem.title}
        </h1>
        <Badge variant="outline" className={difficultyColor(problem.difficulty)}>
          {problem.difficulty}
        </Badge>
      </div>
      {(problem.tools.length > 0 || problem.topics.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {problem.tools.map((tool) => (
            <Badge key={`tool-${tool}`} variant="secondary">
              {tool}
            </Badge>
          ))}
          {problem.topics.map((topic) => (
            <Badge key={`topic-${topic}`} variant="outline">
              {topic}
            </Badge>
          ))}
        </div>
      )}
      <article className="text-sm leading-6 text-foreground [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:py-0.5 [&_h1]:hidden [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mb-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown>{problem.description}</ReactMarkdown>
      </article>
    </div>
  );
}
