"use client";

import { useCallback, useEffect, useState } from "react";
import { useFems } from "@/store/fems";
import type { AlertEvent } from "@/lib/alerts/types";
import { fmtDuration, fmtPct } from "@/lib/format";

const CONDITION_LABEL: Record<AlertEvent["conditionType"], string> = {
  stop_duration: "정지 지속 임계 초과",
  low_utilization: "가동률 기준 미달",
};

const STATUS_STYLE: Record<AlertEvent["status"], { label: string; cls: string }> = {
  sent: { label: "발송", cls: "bg-green-100 text-green-700" },
  skipped_cooldown: { label: "쿨다운", cls: "bg-slate-100 text-slate-600" },
  failed: { label: "실패", cls: "bg-red-100 text-red-700" },
  no_recipients: { label: "수신자 없음", cls: "bg-amber-100 text-amber-700" },
};

export function AlertTab() {
  const showToast = useFems((s) => s.showToast);
  const [events, setEvents] = useState<AlertEvent[] | null>(null);
  const [reRunning, setReRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/events?limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: AlertEvent[] };
      setEvents(data.items);
    } catch (err) {
      showToast(
        "이벤트 로드 실패: " + (err instanceof Error ? err.message : String(err)),
        "error",
      );
      setEvents([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onReEvaluate = async () => {
    setReRunning(true);
    try {
      const res = await fetch("/api/alerts/dispatch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const s = data.summary;
      showToast(
        `재평가 완료 · 발송 ${s.sent} / 쿨다운 ${s.skipped} / 실패 ${s.failed}`,
        s.failed ? "error" : "success",
      );
      await load();
    } catch (err) {
      showToast(
        "재평가 실패: " + (err instanceof Error ? err.message : String(err)),
        "error",
      );
    } finally {
      setReRunning(false);
    }
  };

  const formatValue = (e: AlertEvent): string => {
    return e.conditionType === "stop_duration"
      ? fmtDuration(e.measuredValue)
      : fmtPct(e.measuredValue);
  };
  const formatThreshold = (e: AlertEvent): string => {
    return e.conditionType === "stop_duration"
      ? fmtDuration(e.threshold)
      : fmtPct(e.threshold);
  };

  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
        알림 발송 이력
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={() => void onReEvaluate()}
          disabled={reRunning}
        >
          {reRunning ? "재평가 중..." : "🔁 최근 분석 재평가"}
        </button>
      </h3>
      {events === null ? (
        <div className="text-center text-muted text-[13px] py-10">
          불러오는 중...
        </div>
      ) : events.length === 0 ? (
        <div className="text-center text-muted text-[13px] py-10">
          알림 이력이 없습니다. 분석을 저장하거나 설정 조건이 매칭되면 여기에 표시됩니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <Th>발생 시각</Th>
                <Th>공장</Th>
                <Th>설비</Th>
                <Th>조건</Th>
                <Th align="right">측정값</Th>
                <Th align="right">임계값</Th>
                <Th>상태</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const style = STATUS_STYLE[e.status];
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>{new Date(e.createdAt).toLocaleString("ko-KR")}</Td>
                    <Td>{e.factory}</Td>
                    <Td>{e.equipmentName}</Td>
                    <Td>{CONDITION_LABEL[e.conditionType]}</Td>
                    <Td align="right">{formatValue(e)}</Td>
                    <Td align="right">{formatThreshold(e)}</Td>
                    <Td>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${style.cls}`}
                        title={e.errorMessage ?? undefined}
                      >
                        {style.label}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
