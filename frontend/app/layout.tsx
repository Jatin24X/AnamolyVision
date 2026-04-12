import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const headingFont = Orbitron({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"]
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "AnomalyVision",
  description: "AI-Based Video Anomaly Detection using Masked Auto Encoders"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
