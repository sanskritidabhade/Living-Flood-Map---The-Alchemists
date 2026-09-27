import type { Metadata, Viewport } from "next";
import { Chakra_Petch } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Living Flood Map",
  description: "Turn a CSV of posts from a disaster into a map of where it is happening.",
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${chakra.variable} dark`}>
      <body>
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
