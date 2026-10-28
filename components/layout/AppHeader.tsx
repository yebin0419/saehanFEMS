export function AppHeader() {
  return (
    <header className="bg-gradient-to-br from-[#1e3a8a] to-primary text-white px-7 py-5 shadow-card">
      <div className="flex items-baseline gap-3">
        <h1 className="m-0 text-xl font-bold">saehanFEMS</h1>
        <span className="text-xs opacity-85">
          공장에너지관리시스템 · 설비 비가동 분석 대시보드
        </span>
      </div>
      <div className="mt-1.5 inline-block px-2.5 py-0.5 bg-white/15 rounded-full text-[11px] tracking-wide">
        🔒 브라우저 내 분석 · 데이터 외부 전송 없음
      </div>
    </header>
  );
}
