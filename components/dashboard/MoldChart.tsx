"use client";

import { Bar } from "react-chartjs-2";
import type { AnalysisResult } from "@/types/fems";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function MoldChart({ result }: Props) {
  const hasData = result.totalMold > 0;
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
          <div className="h-full flex items-center justify-center text-muted text-[13px]">
            MOLD 파일이 없거나 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
