import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "LAORS — The Foreman",
    template: "%s | LAORS",
  },
  description:
    "Cattle-first operating system for cow-calf, stocker, and seedstock operations.",
  applicationName: "LAORS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LAORS",
  },
};

export const viewport: Viewport = {
  themeColor: "#27425d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
