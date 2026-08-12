import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  // Dead code once deployed — in prod Caddy already proxies /api/*
  // straight to the backend before a request ever reaches this Next.js
  // server (see infra/Caddyfile). This exists purely so `next dev` run
  // directly on the host (frontend on :3000, backend on a different
  // port) sees /api/auth/* as same-origin, which cookie-based sessions
  // require — see docs/decisions/0002-oauth-login-sessions.md.
  async rewrites() {
    const backend = process.env.LOCAL_BACKEND_URL ?? "http://127.0.0.1:8123";
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
