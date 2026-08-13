import { redirect } from "next/navigation";

// Nothing in the app links here anymore (the footer/nav-bar buttons
// go straight to the external page) — this only exists for anyone
// hitting the old internal URL directly (a bookmark, a stale link).
export default function DonatePage() {
  redirect("https://buymeacoffee.com/bashcode");
}
