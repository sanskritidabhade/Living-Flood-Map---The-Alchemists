import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex">
        {/* PREMIUM SIDEBAR WRAPPER */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 hidden md:flex shrink-0">
          <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-bold tracking-wide text-sm uppercase text-slate-300">Enterprise Console</span>
          </div>
          <nav className="flex-1 p-4 space-y-1.5">
            <a href="#" className="flex items-center space-x-3 bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
              <span>📊 Dashboard</span>
            </a>
            <a href="#" className="flex items-center space-x-3 text-slate-400 hover:bg-slate-800/50 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all">
              <span>⚙️ Configuration</span>
            </a>
          </nav>
          <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
            v2.4.0 • Production Ready
          </div>
        </aside>

        {/* CORE CONTAINER: SAFE ENVIRONMENT FOR YOUR APPS CODE */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0">
            <h1 className="text-lg font-semibold text-slate-800">System Analytics</h1>
            <div className="flex items-center space-x-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Operational</span>
            </div>
          </header>

          {/* YOUR RENDERED APP COMES HERE COMPLETELY UNTOUCHED */}
          <div className="flex-1 overflow-auto p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
