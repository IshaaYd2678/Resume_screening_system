import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeReady",
  description: "A career fitness system for calmer resume growth and race-day readiness."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
