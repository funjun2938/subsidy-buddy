import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MonetizationBlock } from "@/components/MonetizationBlock";
import { ThemeProvider } from "@/components/ThemeProvider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "보조금매칭AI — AI가 찾아주는 나의 정부 지원금",
  description:
    "사업자등록증만 올리면 AI가 사업 정보를 분석하고 맞춤 정부 지원금을 자동 매칭해드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] font-[family-name:var(--font-geist)]">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <MonetizationBlock enablePro />
        </ThemeProvider>
      </body>
    </html>
  );
}
