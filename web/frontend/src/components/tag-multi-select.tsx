"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TagMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option],
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {selected.length > 0 && ` (${selected.length})`}
      </label>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        className="h-7 text-xs"
      />
      <div className="scrollbar-hide flex max-h-32 flex-col gap-0.5 overflow-y-auto rounded border p-1">
        {filtered.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">No matches.</p>
        )}
        {filtered.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent"
          >
            <Check
              className={cn(
                "size-3 shrink-0",
                selected.includes(option) ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="truncate">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
