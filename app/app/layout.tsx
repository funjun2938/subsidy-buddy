import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
    <html lang="ko" className={`${geist.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#030712] text-gray-100 font-[family-name:var(--font-geist)]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
