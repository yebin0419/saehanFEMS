"use client";

import type { AnalysisResult } from "@/types/fems";
import { fmtPct } from "@/lib/format";

interface Props {
  result: AnalysisResult;
}

export function DetailTable({ result }: Props) {
  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold">
        세부 데이터 (설비별 집계)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <Th>공장</Th>
              <Th>설비</Th>
              <Th align="right">Run (분)</Th>
              <Th align="right">Down (분)</Th>
              <Th align="right">Stop (분)</Th>
              <Th align="right">가동률</Th>
              <Th align="right">생산 수량</Th>
            </tr>
          </thead>
          <tbody>
            {result.equipments.map((eq) => (
              <tr key={eq.id} className="hover:bg-slate-50">
                <Td>{eq.factory}</Td>
                <Td>{eq.name}</Td>
                <Td align="right">{eq.run}</Td>
                <Td align="right">{eq.down}</Td>
                <Td align="right">{eq.stop}</Td>
                <Td align="right">{fmtPct(eq.utilization)}</Td>
                <Td align="right">{(eq.moldQty || 0).toLocaleString()}</Td>
              </tr>
            ))}
            {result.equipments.length === 0 && (
              <tr>
                <td
                  colSpan={7}
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
