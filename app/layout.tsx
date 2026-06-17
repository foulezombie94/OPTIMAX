import type { Metadata } from "next";
import { Geist, Inter, Fredoka } from "next/font/google";
import { TranslationProvider } from "@/contexts/TranslationContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalCallListener from "@/components/GlobalCallListener";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-cartoon",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OptiMax - Professional File Optimization",
  description: "Impeccable quality. Microscopic weight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geist.variable} ${inter.variable} ${fredoka.variable} antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col relative bg-background text-on-background font-body-md overflow-x-hidden selection:bg-primary/30 selection:text-primary">
        <TranslationProvider>
          {/* Global Background Elements */}
          <div className="fixed inset-0 bg-technical-grid z-[-2]"></div>
          <div className="blob-container">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
          </div>

          <GlobalCallListener />
          <Navbar />
          {children}
          <Footer />
        </TranslationProvider>
      </body>
    </html>
  );
}
