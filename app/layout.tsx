import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DevTools } from "@/components/dev-tools";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HackerTok",
  description: "Swipe through the best Hacker News stories",
  other: {
    "theme-color": "#ffffff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
        <DevTools />
      </body>
    </html>
  );
}
