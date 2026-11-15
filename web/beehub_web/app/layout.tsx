import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Quicksand, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeInit } from "@/components/shared/theme-init";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { ChatWidget } from "@/components/chatbot/chat-widget";
import "./globals.css";
import { LocationSharingProvider } from "@/components/tracking/LocationSharingProvider";

// Quicksand: font chính toàn hệ thống (hỗ trợ tiếng Việt, weight 300–700)
const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BeeHub - Chuyển trọ & Chợ sinh viên",
  description: "Nền tảng chuyển đồ và mua bán đồ dùng sinh viên",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${quicksand.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <ThemeInit />
        <ToastProvider><LocationSharingProvider>{children}</LocationSharingProvider></ToastProvider>
        <ChatWidget />
      </body>
    </html>
  );
}
