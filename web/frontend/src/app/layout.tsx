import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NavBar } from "@/components/nav-bar";
import { BetaBanner } from "@/components/beta-banner";
import { AuthProvider } from "@/lib/auth-context";
import { ProgressProvider } from "@/lib/progress-context";
import { ToastProvider, Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BashCode",
  description: "Hands-on Bash and Linux practice problems for SRE and DevOps engineers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* A plain server-rendered <script> tag, deliberately NOT
            next/script: AdSense's own "site ready" checker fetches the
            raw HTML and greps for this literal tag inside <head>...
            </head> — it doesn't execute JS. next/script's
            afterInteractive strategy never puts a real <script src>
            anywhere in the initial HTML (it's injected by client JS
            after hydration), and even beforeInteractive only emits a
            <link rel="preload"> server-side, not the tag itself — so
            neither strategy is visible to that checker. A raw tag here
            is ordinary JSX with nothing to hydrate, so it's byte-for-
            byte present in every response. Consent itself is still
            Google's own "Privacy & messaging" (a certified CMP,
            configured in the AdSense dashboard) — that's what decides
            whether/when a visitor sees a consent dialog, not this tag;
            it loads unconditionally on purpose. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9510918227818625"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ToastProvider>
            <AuthProvider>
              <ProgressProvider>
                <BetaBanner />
                <NavBar />
                {children}
                <Toaster />
              </ProgressProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
