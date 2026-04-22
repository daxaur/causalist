import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Causalist — See what your code means",
  description:
    "Paste a GitHub URL. Claude agents map your codebase into a 3D causal graph. Explore, understand, review.",
  openGraph: {
    title: "Causalist",
    description: "Paste a GitHub URL. See what your code means. In 3D.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
