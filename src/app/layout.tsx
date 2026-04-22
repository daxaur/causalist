import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph — See what your code means",
  description:
    "Paste a GitHub URL. Claude agents map your codebase into a 3D causal graph. Explore, understand, review.",
  openGraph: {
    title: "Cartograph",
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
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
