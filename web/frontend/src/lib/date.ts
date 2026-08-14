// Single source of truth for turning a Date into a "YYYY-MM-DD" key in
// the browser's local timezone. Used anywhere a timestamp needs to be
// bucketed into a calendar day for display (the activity heatmap) —
// centralized here so the write side (progress-context.tsx) and the
// read side (mini-calendar.tsx) can never drift into different
// timezones for the same key, which is what caused a submission made
// late in the evening to render on the wrong day (UTC-bucketed writes
// vs. local-bucketed reads).
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
