import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Flipz Arcade",
  description: "Fair social casino for GTA World — Fleeca powered",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={space.variable}>
      <body className="min-h-screen bg-flipz-dark font-display text-white antialiased">
        {children}
      </body>
    </html>
  );
}
