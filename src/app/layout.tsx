import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { HeaderActionsProvider, SiteHeader } from "@/components/nav/site-header";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Causalist — See what your code actually means",
  description:
    "Paste a GitHub URL. Claude agents map your codebase into an interactive 3D causal graph. Explore architecture, understand connections, review PRs visually.",
  applicationName: "Causalist",
  openGraph: {
    title: "Causalist",
    description: "Paste a GitHub URL. See what your code actually means. In 3D.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head>
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&f[]=satoshi@300,400,500,700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        <HeaderActionsProvider>
          <SiteHeader />
          {children}
        </HeaderActionsProvider>
      </body>
    </html>
  );
}
