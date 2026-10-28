"use client";

import { Bar } from "react-chartjs-2";
import type { AnalysisResult } from "@/types/fems";
import { COLORS, WORK_DAY_START } from "@/lib/constants";
import { fmtDuration } from "@/lib/format";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function HourlyStackedBar({ result }: Props) {
  const labels: string[] = [];
  const run: number[] = [];
  const down: number[] = [];
  const stop: number[] = [];
  for (let h = 0; h < 24; h++) {
    labels.push(String((h + WORK_DAY_START) % 24).padStart(2, "0") + "시");
    run.push(result.hourly[h].run);
    down.push(result.hourly[h].down);
    stop.push(result.hourly[h].stop);
  }

  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
        시간대별 상태 분포
        <span className="text-[11px] text-muted font-normal">
          24시간 (07시 ~ 익일 07시)
        </span>
      </h3>
      <div className="relative h-[400px]">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Run",
                data: run,
                backgroundColor: COLORS.run,
                stack: "s",
              },
              {
                label: "Down",
                data: down,
                backgroundColor: COLORS.down,
                stack: "s",
              },
              {
                label: "Stop",
                data: stop,
                backgroundColor: COLORS.stop,
                stack: "s",
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true },
              y: {
                stacked: true,
                title: { display: true, text: "분" },
              },
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
