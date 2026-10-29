"use client";

import { Bar } from "react-chartjs-2";
import type { AnalysisResult } from "@/types/fems";
import { useFems } from "@/store/fems";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function MoldChart({ result }: Props) {
  const hasData = result.totalMold > 0;
  const moldFileCount = useFems((s) => s.moldFiles.length);
  const moldRowCount = useFems((s) => s.moldRows.length);
  const emptyMessage =
    moldFileCount === 0
      ? "MOLD 파일이 없거나 데이터가 없습니다."
      : moldRowCount === 0
        ? "MOLD 파일을 인식하지 못했습니다. '설비ID'와 '수량' 컬럼을 확인해주세요."
        : "분석 범위 안에 MOLD 생산 데이터가 없습니다.";
  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold">
        MOLD 생산 수량 (12시간 전/후)
      </h3>
      <div className="relative h-[300px]">
        {hasData ? (
          <Bar
            data={{
              labels: ["전반 12H (07-19)", "후반 12H (19-07)"],
              datasets: [
                {
                  label: "생산 수량 (개)",
                  data: [result.moldFirst12, result.moldLast12],
                  backgroundColor: ["#2563eb", "#60a5fa"],
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { title: { display: true, text: "수량" } } },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted text-[13px] text-center px-3">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
