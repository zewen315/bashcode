// There is no real auth system (see README: explicitly out of scope
// for V1). This is a local-only, clearly-labeled preview of what the
// signed-in UI will look like once real accounts exist — never treat
// it as an actual session, and never remove the "Demo" labeling that
// goes with it wherever it's shown.
const DEMO_USER_KEY = "bashcode:demo-user";

export type DemoUser = { name: string };

export function getDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_USER_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

export function setDemoUser(user: DemoUser) {
  window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
}

export function clearDemoUser() {
  window.localStorage.removeItem(DEMO_USER_KEY);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
