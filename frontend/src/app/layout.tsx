import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClipWise — AI-Powered Video Repurposer",
  description:
    "Transform long-form videos into viral short-form clips using AI. Automatic transcription, intelligent clip detection, and engagement scoring.",
  keywords: [
    "video repurposer",
    "AI video editor",
    "short-form content",
    "video clips",
    "SaaS",
  ],
  authors: [{ name: "ClipWise" }],
  openGraph: {
    title: "ClipWise — AI-Powered Video Repurposer",
    description:
      "Transform long-form videos into viral short-form clips using AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
