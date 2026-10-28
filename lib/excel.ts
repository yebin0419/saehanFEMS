import * as XLSX from "xlsx";
import type { AnalysisResult } from "@/types/fems";
import { WORK_DAY_START } from "./constants";
import { fmtPct } from "./format";

export function downloadExcelReport(r: AnalysisResult): string {
  const wb = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ["항목", "값"],
    ["공장", r.factory],
    ["분석 기간 시작", r.from || "-"],
    ["분석 기간 종료", r.to || "-"],
    ["분석 설비 수", r.equipments.length],
    ["총 측정 시간 (분)", r.totalMinutes],
    ["Run (분)", r.totalRun],
    ["Down (분)", r.totalDown],
    ["Stop (분)", r.totalStop],
    ["종합 가동률", fmtPct(r.utilization)],
    ["총 생산 수량", r.totalMold],
    ["12H 전반 생산", r.moldFirst12],
    ["12H 후반 생산", r.moldLast12],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "요약",
  );

  const eqRows: (string | number)[][] = [
    ["공장", "설비ID", "설비명", "Run(분)", "Down(분)", "Stop(분)", "가동률(%)", "생산수량"],
    ...r.equipments.map((eq) => [
      eq.factory,
      eq.id,
      eq.name,
      eq.run,
      eq.down,
      eq.stop,
      Number((eq.utilization * 100).toFixed(2)),
      eq.moldQty || 0,
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(eqRows),
    "설비별 집계",
  );

  const hourRows: (string | number)[][] = [["시각", "Run(분)", "Down(분)", "Stop(분)"]];
  for (let h = 0; h < 24; h++) {
    const realHour = (h + WORK_DAY_START) % 24;
    hourRows.push([
      String(realHour).padStart(2, "0") + ":00",
      r.hourly[h].run,
      r.hourly[h].down,
      r.hourly[h].stop,
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hourRows), "시간대별");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["교대", "Run(분)", "Down(분)", "Stop(분)"],
      ["주간 (07-19)", r.shift.day.run, r.shift.day.down, r.shift.day.stop],
      ["야간 (19-07)", r.shift.night.run, r.shift.night.down, r.shift.night.stop],
    ]),
    "교대별",
  );

  const fname = `saehanFEMS_보고서_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
}
