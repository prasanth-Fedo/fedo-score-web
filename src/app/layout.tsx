import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { VitalsProvider } from "@/context/VitalsContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FedoScore",
  description: "Your health, at a glance — contactless vital signs and health scoring",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FedoScore",
  },
};

export const viewport: Viewport = {
  themeColor: "#FB923C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="bg-warm-50 text-cream-800 font-body antialiased min-h-screen">
        <VitalsProvider>{children}</VitalsProvider>
      </body>
    </html>
  );
}
