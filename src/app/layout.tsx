import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "sonner";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Nimbus 2026",
  description: "Production Manager — Nimbus 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={`${outfit.variable} font-sans antialiased bg-page text-primary`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-[240px] p-6 pb-24 md:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
