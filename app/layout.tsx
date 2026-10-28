import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
