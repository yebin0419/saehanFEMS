"use client";

import { useFems } from "@/store/fems";
import { LiveTab } from "./LiveTab";

export function LiveOnlyView() {
  const exitLiveOnly = useFems((s) => s.exitLiveOnly);
  return (
    <>
      <div className="flex items-center justify-between mb-4 no-print">
        <h2 className="m-0 text-base font-semibold">
          📡 실시간 공장 모니터링
        </h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={exitLiveOnly}
        >
          ← 분석/업로드로 돌아가기
        </button>
      </div>
      <LiveTab />
    </>
  );
}
