import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Living Flood Map",
  description:
    "Turn a CSV of posts from a disaster into a map of where it is happening and who it affects. Built for CE Strategies.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold tracking-tight text-secondary">
                Living Flood Map
              </span>
              <span className="text-sm text-muted">CE Strategies</span>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
