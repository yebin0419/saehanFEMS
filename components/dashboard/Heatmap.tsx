"use client";

import type { AnalysisResult } from "@/types/fems";
import { COLORS, WORK_DAY_START } from "@/lib/constants";

interface Props {
  result: AnalysisResult;
}

type Dominant = "run" | "down" | "stop" | null;

export function Heatmap({ result }: Props) {
  if (result.equipments.length === 0) {
    return (
      <div className="panel">
        <HeatmapHeader />
        <div className="text-center text-muted text-[13px] py-10">
          표시할 설비가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <HeatmapHeader />
      <div className="overflow-x-auto">
        <table className="border-collapse text-[11px] w-full min-w-[760px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-slate-100 font-medium text-left px-2 py-1 min-w-[140px] max-w-[180px] border border-white">
                설비
              </th>
              {Array.from({ length: 24 }, (_, h) => {
                const realHour = (h + WORK_DAY_START) % 24;
                return (
                  <th
                    key={h}
                    className="bg-slate-100 font-medium px-1 py-1 border border-white sticky top-0"
                  >
                    {String(realHour).padStart(2, "0")}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {result.equipments.map((eq) => (
              <tr key={eq.id}>
                <td
                  title={eq.id}
                  className="sticky left-0 z-10 bg-white font-medium px-2 py-1 border border-white"
                >
                  {eq.name}
                </td>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = eq.hourly[h];
                  const total = cell.run + cell.down + cell.stop;
                  let dominant: Dominant = null;
                  let bg = "#e5e7eb";
                  if (total > 0) {
                    dominant =
                      cell.stop >= cell.down && cell.stop >= cell.run
                        ? "stop"
                        : cell.down >= cell.run
                          ? "down"
                          : "run";
                    bg = COLORS[dominant];
                  }
                  const realHour = (h + WORK_DAY_START) % 24;
                  const title = dominant
                    ? `${eq.name} · ${String(realHour).padStart(2, "0")}시 · ${dominant.toUpperCase()} ${cell[dominant]}분`
                    : `${eq.name} · ${String(realHour).padStart(2, "0")}시 · 데이터 없음`;
                  return (
                    <td
                      key={h}
                      title={title}
                      className="border border-white"
                      style={{
                        background: bg,
                        width: 28,
                        height: 24,
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 mt-2.5 text-[11px] text-muted">
        <LegendItem color={COLORS.run} label="Run" />
        <LegendItem color={COLORS.down} label="Down" />
        <LegendItem color={COLORS.stop} label="Stop" />
        <LegendItem color="#e5e7eb" label="데이터 없음" />
      </div>
    </div>
  );
}

function HeatmapHeader() {
  return (
    <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
      히트맵
      <span className="text-[11px] text-muted font-normal">
        07:00 ~ 익일 07:00 · 설비 × 시간
      </span>
    </h3>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block w-3.5 h-3.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}
