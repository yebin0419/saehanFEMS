"use client";

import type { AnalysisResult } from "@/types/fems";
import { COLORS } from "@/lib/constants";
import { fmtDuration, fmtPct } from "@/lib/format";

interface Props {
  result: AnalysisResult;
}

export function EquipmentSummaryTable({ result }: Props) {
  const rows = [...result.equipments].sort(
    (a, b) => b.utilization - a.utilization,
  );

  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
        설비별 가동률
        <span className="text-[11px] text-muted font-normal">높은 순</span>
      </h3>
      <div className="max-h-[320px] overflow-y-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <Th>설비</Th>
              <Th align="right">Run</Th>
              <Th align="right">Down</Th>
              <Th align="right">Stop</Th>
              <Th align="right">가동률</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((eq) => {
              const barColor =
                eq.utilization > 0.8
                  ? COLORS.run
                  : eq.utilization > 0.5
                    ? COLORS.down
                    : COLORS.stop;
              return (
                <tr key={eq.id} className="hover:bg-slate-50">
                  <Td>{eq.name}</Td>
                  <Td align="right">{fmtDuration(eq.run)}</Td>
                  <Td align="right">{fmtDuration(eq.down)}</Td>
                  <Td align="right">{fmtDuration(eq.stop)}</Td>
                  <Td align="right">
                    <div className="relative bg-slate-100 rounded h-3.5 min-w-[100px]">
                      <div
                        className="absolute top-0 left-0 h-full rounded"
                        style={{
                          width: `${(eq.utilization * 100).toFixed(1)}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {fmtPct(eq.utilization)}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-muted text-[13px] py-10"
                >
                  표시할 설비가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`bg-slate-50 font-semibold px-2.5 py-1.5 border-b border-border ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-2.5 py-1.5 border-b border-border ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}
