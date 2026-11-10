import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "saehanFEMS · 공장에너지관리시스템",
  description:
    "새한프라텍 FEMS — 센서 데이터 기반 실시간 공장 에너지 관리 및 설비 비가동 분석 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          src="https://chatbot.aiconvergencelab.com/widget.js"
          data-slug="bot-d60ef01c"
          data-title="예빈봇"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
