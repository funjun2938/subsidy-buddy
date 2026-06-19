import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MonetizationBlock } from "@/components/MonetizationBlock";
import { ThemeProvider } from "@/components/ThemeProvider";
import FavoriteToast from "@/components/FavoriteToast";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "리스탠드 — 소상공인이 다시 일어서는 AI 정부지원금",
  description:
    "소상공인을 위한 AI 정부지원금. 사업자등록증 한 장이면 AI가 사업 정보를 분석해 맞춤 지원사업을 자동 매칭하고, 공식 서식까지 작성해드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] font-[family-name:var(--font-geist)]">
        <ThemeProvider>
          {/* PRO 배너(40px) 공간 확보 */}
          <div className="h-10" />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <MonetizationBlock enablePro />
          <FavoriteToast />
        </ThemeProvider>
      </body>
    </html>
  );
}
