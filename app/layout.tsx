import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import Script from "next/script";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadFlow",
  description: "LeadFlow keeps every sales lead organized and actionable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isE2ETestMode = isSafeE2ETestMode();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <Script id="scroll-top-on-refresh" strategy="beforeInteractive">
          {`
            if (typeof window !== "undefined") {
              if ("scrollRestoration" in window.history) {
                window.history.scrollRestoration = "manual";
              }
              window.addEventListener("beforeunload", function () {
                window.scrollTo(0, 0);
              });
              window.addEventListener("pageshow", function () {
                window.scrollTo(0, 0);
              });
            }
          `}
        </Script>
        {isE2ETestMode ? children : <ClerkProvider>{children}</ClerkProvider>}
      </body>
    </html>
  );
}
