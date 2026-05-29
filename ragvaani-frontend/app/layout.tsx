import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e1a",
};

export const metadata: Metadata = {
  title: "RagVaani 2.0 — Intelligent Document Assistant",
  description:
    "RagVaani 2.0: Ask questions about your documents in English or Hindi. Powered by Retrieval-Augmented Generation.",
  keywords: ["RAG", "document assistant", "Hindi", "AI", "RagVaani"],
  authors: [{ name: "RagVaani Team" }],
  openGraph: {
    title: "RagVaani 2.0",
    description: "Intelligent multilingual document assistant",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0e1a] text-[#f1f5f9] overflow-hidden">
        {children}
      </body>
    </html>
  );
}
