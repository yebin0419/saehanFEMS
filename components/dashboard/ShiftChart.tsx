"use client";

import { Bar } from "react-chartjs-2";
import type { AnalysisResult } from "@/types/fems";
import { COLORS } from "@/lib/constants";
import { fmtDuration } from "@/lib/format";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function ShiftChart({ result }: Props) {
  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold">교대별 비가동 시간</h3>
      <div className="relative h-[300px]">
        <Bar
          data={{
            labels: ["주간 (07-19)", "야간 (19-07)"],
            datasets: [
              {
                label: "Run",
                data: [result.shift.day.run, result.shift.night.run],
                backgroundColor: COLORS.run,
              },
              {
                label: "Down",
                data: [result.shift.day.down, result.shift.night.down],
                backgroundColor: COLORS.down,
              },
              {
                label: "Stop",
                data: [result.shift.day.stop, result.shift.night.stop],
                backgroundColor: COLORS.stop,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true },
              y: { stacked: true, title: { display: true, text: "분" } },
            },
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label: (c) =>
                    `${c.dataset.label}: ${fmtDuration(c.parsed.y as number)}`,
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
