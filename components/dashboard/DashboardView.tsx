"use client";

import { useMemo, useState } from "react";
import { useFems, type DashboardTab } from "@/store/fems";
import { applyFilters } from "@/lib/aggregate";
import { downloadExcelReport } from "@/lib/excel";
import { DashboardToolbar } from "./DashboardToolbar";
import { KpiGrid } from "./KpiGrid";
import { StatusDoughnut } from "./StatusDoughnut";
import { EquipmentSummaryTable } from "./EquipmentSummaryTable";
import { ThresholdModal } from "./ThresholdModal";
import { TimeTab } from "./TimeTab";
import { CauseTab } from "./CauseTab";
import { WeekTab } from "./WeekTab";
import { AlertTab } from "./AlertTab";
import { AlertConfigModal } from "./AlertConfigModal";
import { LiveTab } from "./LiveTab";

const TABS: Array<{ key: DashboardTab; label: string }> = [
  { key: "overview", label: "개요" },
  { key: "time", label: "시간대 분석" },
  { key: "cause", label: "원인 분석" },
  { key: "week", label: "추세 · 요약" },
  { key: "alerts", label: "알림" },
  { key: "live", label: "실시간" },
];

export function DashboardView() {
  const analyzed = useFems((s) => s.analyzed);
  const filters = useFems((s) => s.filters);
  const activeTab = useFems((s) => s.activeTab);
  const setActiveTab = useFems((s) => s.setActiveTab);
  const showToast = useFems((s) => s.showToast);
  const saveAnalysis = useFems((s) => s.saveAnalysis);
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [alertConfigOpen, setAlertConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!analyzed) return null;
    return applyFilters(analyzed, filters);
  }, [analyzed, filters]);

  if (!analyzed || !filtered) return null;

  const onExcel = () => {
    try {
      const fname = downloadExcelReport(filtered);
      showToast("엑셀 보고서를 다운로드했습니다: " + fname, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast("엑셀 생성 실패: " + message, "error");
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveAnalysis();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DashboardToolbar
        result={filtered}
        onOpenThreshold={() => setThresholdOpen(true)}
      />

      <nav className="flex gap-1 border-b-2 border-border mb-4 no-print">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 bg-transparent border-0 border-b-2 -mb-0.5 text-sm font-medium cursor-pointer transition ${
              activeTab === t.key
                ? "text-primary border-primary font-semibold"
                : "text-muted border-transparent hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <>
          <KpiGrid result={filtered} />
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusDoughnut result={filtered} />
            <EquipmentSummaryTable result={filtered} />
          </div>
        </>
      )}
      {activeTab === "time" && <TimeTab result={filtered} />}
      {activeTab === "cause" && <CauseTab result={filtered} />}
      {activeTab === "week" && <WeekTab result={filtered} />}
      {activeTab === "alerts" && <AlertTab />}
      {activeTab === "live" && <LiveTab />}

      <div className="flex gap-2 mt-4 justify-end no-print">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setAlertConfigOpen(true)}
        >
          🔔 알림 설정
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.print()}
        >
          🖨 화면 인쇄 / PDF
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void onSave()}
          disabled={saving}
        >
          💾 {saving ? "저장 중..." : "분석 저장"}
        </button>
        <button type="button" className="btn btn-primary" onClick={onExcel}>
          📥 엑셀 보고서 받기
        </button>
      </div>

      <ThresholdModal
        open={thresholdOpen}
        onClose={() => setThresholdOpen(false)}
      />
      <AlertConfigModal
        open={alertConfigOpen}
        onClose={() => setAlertConfigOpen(false)}
      />
    </>
  );
}
