"use client";

import { Chart as ReactChart } from "react-chartjs-2";
import type { AnalysisResult } from "@/types/fems";
import { COLORS } from "@/lib/constants";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function ParetoChart({ result }: Props) {
  const sorted = [...result.equipments]
    .map((eq) => ({ name: eq.name, downtime: eq.down + eq.stop }))
    .filter((e) => e.downtime > 0)
    .sort((a, b) => b.downtime - a.downtime)
    .slice(0, 15);

  const totalDown = sorted.reduce((s, e) => s + e.downtime, 0) || 1;
  let cum = 0;
  const cumulative = sorted.map((e) => {
    cum += e.downtime;
    return (cum / totalDown) * 100;
  });

  const hasData = sorted.length > 0;

  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
        설비별 비가동 시간 파레토
        <span className="text-[11px] text-muted font-normal">
          Stop + Down 합계 기준
        </span>
      </h3>
      <div className="relative h-[400px]">
        {hasData ? (
          <ReactChart
            type="bar"
            data={{
              labels: sorted.map((e) => e.name),
              datasets: [
                {
                  type: "bar" as const,
                  label: "비가동 시간",
                  data: sorted.map((e) => e.downtime),
                  backgroundColor: COLORS.stop,
                  yAxisID: "y",
                },
                {
                  type: "line" as const,
                  label: "누적 비율 (%)",
                  data: cumulative,
                  borderColor: "#2563eb",
                  backgroundColor: "transparent",
                  yAxisID: "y1",
                  tension: 0.2,
                  pointRadius: 3,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  position: "left",
                  title: { display: true, text: "분" },
                },
                y1: {
                  position: "right",
                  min: 0,
                  max: 100,
                  title: { display: true, text: "누적 %" },
                  grid: { drawOnChartArea: false },
                },
              },
              plugins: { legend: { position: "bottom" } },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted text-[13px]">
            비가동 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
