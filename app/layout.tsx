import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { headers } from "next/headers";
import { ScrollRestoration } from "@/components/scroll-restoration";
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
  icons: {
    icon: [{ url: "/brand/leadflow-mark.svg", type: "image/svg+xml" }],
    shortcut: "/brand/leadflow-mark.svg",
    apple: "/brand/leadflow-mark.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isE2ETestMode = isSafeE2ETestMode();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <ScrollRestoration />
        {isE2ETestMode ? (
          children
        ) : (
          <ClerkProvider dynamic nonce={nonce}>
            {children}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
