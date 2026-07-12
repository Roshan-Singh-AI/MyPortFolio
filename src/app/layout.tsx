import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/content/site";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import PageTransition from "@/components/PageTransition";
import CommandPaletteProvider from "@/components/CommandPaletteProvider";
import AiLauncher from "@/components/AiLauncher";

// Self-hosted Geist (variable) -- reliable offline builds + on Vercel.
const geistSans = localFont({
  src: [
    { path: "./fonts/Geist-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/Geist-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-sans-var",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const geistMono = localFont({
  src: [
    { path: "./fonts/GeistMono-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/GeistMono-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-mono-var",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} -- ${site.title}`,
    template: `%s -- ${site.name}`,
  },
  description: site.positioning,
  keywords: [
    "AI Engineer",
    "LLM",
    "RAG",
    "GraphRAG",
    "AI agents",
    "LangGraph",
    "LangChain",
    "Roshan Singh",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    title: `${site.name} -- ${site.title}`,
    description: site.positioning,
    url: site.url,
    siteName: `${site.name} -- Portfolio`,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} -- ${site.title}`,
    description: site.positioning,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col bg-bg text-text">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[#08080c]"
        >
          Skip to content
        </a>
        <CommandPaletteProvider>
          <CursorGlow />
          <Nav />
          <PageTransition>
            <main id="content" className="flex-1">
              {children}
            </main>
          </PageTransition>
          <Footer />
          <AiLauncher />
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
