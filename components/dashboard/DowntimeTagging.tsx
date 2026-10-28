"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { useFems } from "@/store/fems";
import type { AnalysisResult } from "@/types/fems";
import {
  DOWNTIME_REASONS,
  REASON_COLOR,
  REASON_LABEL,
  type DowntimeInterval,
  type DowntimeReason,
  type DowntimeTag,
} from "@/lib/downtime/types";
import { recommendReason } from "@/lib/downtime/recommend";
import { fmtDuration } from "@/lib/format";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

interface Row extends DowntimeInterval {
  equipmentName: string;
  factory: string;
  reason: DowntimeReason;
  note: string | null;
  recommended: DowntimeReason;
  saving: boolean;
}

export function DowntimeTagging({ result }: Props) {
  const savedAnalysisId = useFems((s) => s.savedAnalysisId);
  const showToast = useFems((s) => s.showToast);
  const [tags, setTags] = useState<Record<string, DowntimeTag>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const intervals = useMemo(() => {
    const list: Array<DowntimeInterval & { equipmentName: string; factory: string }> = [];
    for (const eq of result.equipments) {
      for (const it of eq.downtimeIntervals) {
        list.push({ ...it, equipmentName: eq.name, factory: eq.factory });
      }
    }
    list.sort((a, b) => b.durationMinutes - a.durationMinutes);
    return list;
  }, [result.equipments]);

  useEffect(() => {
    if (!savedAnalysisId) {
      setTags({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/downtime-tags?analysisId=${encodeURIComponent(savedAnalysisId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: DowntimeTag[] };
        if (cancelled) return;
        const map: Record<string, DowntimeTag> = {};
        for (const t of data.items) map[t.intervalId] = t;
        setTags(map);
      } catch (err) {
        if (!cancelled)
          showToast(
            "태그 로드 실패: " + (err instanceof Error ? err.message : String(err)),
            "error",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [savedAnalysisId, showToast]);

  const rows: Row[] = useMemo(
    () =>
      intervals.map((it) => {
        const tag = tags[it.id];
        const recommended = recommendReason(it);
        return {
          ...it,
          reason: tag?.reason ?? "UNASSIGNED",
          note: tag?.note ?? null,
          recommended,
          saving: savingIds.has(it.id),
        };
      }),
    [intervals, tags, savingIds],
  );

  const totals = useMemo(() => {
    const perReason: Record<DowntimeReason, { minutes: number; loss: number; count: number }> = {
      BREAKDOWN: { minutes: 0, loss: 0, count: 0 },
      MOLD_CHANGE: { minutes: 0, loss: 0, count: 0 },
      MATERIAL_WAIT: { minutes: 0, loss: 0, count: 0 },
      PLANNED_STOP: { minutes: 0, loss: 0, count: 0 },
      QUALITY: { minutes: 0, loss: 0, count: 0 },
      UNASSIGNED: { minutes: 0, loss: 0, count: 0 },
    };
    for (const r of rows) {
      perReason[r.reason].minutes += r.durationMinutes;
      perReason[r.reason].loss += r.estimatedKwhLoss;
      perReason[r.reason].count += 1;
    }
    return perReason;
  }, [rows]);

  const totalLoss = useMemo(
    () => Object.values(totals).reduce((s, v) => s + v.loss, 0),
    [totals],
  );

  const updateTag = useCallback(
    async (intervalId: string, reason: DowntimeReason) => {
      if (!savedAnalysisId) {
        showToast("분석을 먼저 저장해야 사유 태그를 적용할 수 있습니다.", "error");
        return;
      }
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.add(intervalId);
        return next;
      });
      try {
        const res = await fetch("/api/downtime-tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisId: savedAnalysisId,
            intervalId,
            reason,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { item: DowntimeTag };
        setTags((prev) => ({ ...prev, [intervalId]: data.item }));
      } catch (err) {
        showToast(
          "태그 저장 실패: " + (err instanceof Error ? err.message : String(err)),
          "error",
        );
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(intervalId);
          return next;
        });
      }
    },
    [savedAnalysisId, showToast],
  );

  if (intervals.length === 0) {
    return (
      <div className="panel">
        <h3 className="m-0 mb-3 text-[14px] font-semibold">비가동 사유 태깅</h3>
        <div className="text-center text-muted text-[13px] py-10">
          비가동 구간이 없습니다.
        </div>
      </div>
    );
  }

  const barData = {
    labels: DOWNTIME_REASONS.filter((r) => totals[r].minutes > 0).map(
      (r) => REASON_LABEL[r],
    ),
    datasets: [
      {
        label: "비가동 시간 (분)",
        data: DOWNTIME_REASONS.filter((r) => totals[r].minutes > 0).map(
          (r) => totals[r].minutes,
        ),
        backgroundColor: DOWNTIME_REASONS.filter((r) => totals[r].minutes > 0).map(
          (r) => REASON_COLOR[r],
        ),
      },
    ],
  };

  return (
    <>
      <div className="panel">
        <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
          사유별 비가동 집계
          <span className="text-[11px] text-muted font-normal">
            총 추정 손실 {totalLoss.toFixed(2)} kWh · {rows.length}건
          </span>
        </h3>
        <div
          className="grid gap-3 mb-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
        >
          {DOWNTIME_REASONS.map((r) => {
            const t = totals[r];
            if (t.count === 0 && r !== "UNASSIGNED") return null;
            return (
              <div
                key={r}
                className="border border-border rounded-card p-3"
                style={{ borderLeftColor: REASON_COLOR[r], borderLeftWidth: 4 }}
              >
                <div className="text-xs text-muted font-medium">
                  {REASON_LABEL[r]}
                </div>
                <div className="text-lg font-bold mt-0.5">
                  {fmtDuration(t.minutes)}
                </div>
                <div className="text-[11px] text-muted">
                  {t.count}건 · {t.loss.toFixed(1)} kWh
                </div>
              </div>
            );
          })}
        </div>
        <div className="relative h-[260px]">
          <Bar
            data={barData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { title: { display: true, text: "분" } } },
            }}
          />
        </div>
      </div>

      <div className="panel">
        <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
          비가동 구간 목록
          <span className="text-[11px] text-muted font-normal">
            {savedAnalysisId
              ? "사유 선택 시 자동 저장됩니다"
              : "분석을 저장하면 사유 태그를 저장할 수 있습니다"}
          </span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <Th>설비</Th>
                <Th>시작</Th>
                <Th>종료</Th>
                <Th align="right">지속</Th>
                <Th>상태</Th>
                <Th align="right">평균 전류</Th>
                <Th align="right">손실 (kWh)</Th>
                <Th>사유</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>{r.equipmentName}</Td>
                  <Td>{formatIso(r.startIso)}</Td>
                  <Td>{formatIso(r.endIso)}</Td>
                  <Td align="right">{fmtDuration(r.durationMinutes)}</Td>
                  <Td>
                    <span
                      className={`status-tag ${r.state === "stop" ? "status-tag-stop" : "status-tag-down"}`}
                    >
                      {r.state.toUpperCase()}
                    </span>
                  </Td>
                  <Td align="right">{r.avgAmpere.toFixed(2)} A</Td>
                  <Td align="right">{r.estimatedKwhLoss.toFixed(2)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={r.reason}
                        onChange={(e) =>
                          void updateTag(r.id, e.target.value as DowntimeReason)
                        }
                        disabled={!savedAnalysisId || r.saving}
                        className="px-1.5 py-0.5 border border-border rounded text-xs bg-white disabled:bg-slate-50"
                        style={{ borderLeftColor: REASON_COLOR[r.reason], borderLeftWidth: 3 }}
                      >
                        {DOWNTIME_REASONS.map((v) => (
                          <option key={v} value={v}>
                            {REASON_LABEL[v]}
                          </option>
                        ))}
                      </select>
                      {r.reason === "UNASSIGNED" && r.recommended !== "UNASSIGNED" && (
                        <button
                          type="button"
                          className="text-[10px] text-primary hover:underline"
                          disabled={!savedAnalysisId || r.saving}
                          onClick={() => void updateTag(r.id, r.recommended)}
                          title="자동 추천 적용"
                        >
                          추천: {REASON_LABEL[r.recommended]}
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function formatIso(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
      className={`bg-slate-50 font-semibold px-2 py-1.5 border-b border-border ${
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
      className={`px-2 py-1.5 border-b border-border ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}
