import type { Metadata } from "next";
import Script from "next/script";
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Consent itself is handled by Google's own "Privacy &
            messaging" (a certified CMP), configured in the AdSense
            dashboard — that's what decides whether/when a visitor sees
            a consent dialog, not code here. This script load is
            unconditional on purpose; a custom consent gate in front of
            it would be redundant with (and could conflict with)
            Google's own flow. */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9510918227818625"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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
