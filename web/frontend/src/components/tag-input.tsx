"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagInput({
  label,
  options,
  counts,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  counts?: Record<string, number>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = options.filter(
    (o) => !selected.includes(o) && o.toLowerCase().includes(query.toLowerCase()),
  );

  function addTag(tag: string) {
    onChange([...selected, tag]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(selected.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query && suggestions.length > 0) {
      e.preventDefault();
      addTag(suggestions[0]);
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {selected.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? `Type to search ${label.toLowerCase()}…` : ""}
          className="min-w-20 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && query && suggestions.length > 0 && (
        <div className="scrollbar-hide absolute top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => addTag(option)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              {option}
              {counts?.[option] !== undefined && (
                <span className="text-muted-foreground/70">{counts[option]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
