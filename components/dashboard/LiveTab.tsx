"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFems } from "@/store/fems";
import { fromSerializable, type SerializableAnalysisResult } from "@/lib/storage/types";
import type { AnalysisResult } from "@/types/fems";
import { fmtPct } from "@/lib/format";
import { KpiGrid } from "./KpiGrid";
import { StatusDoughnut } from "./StatusDoughnut";
import { EquipmentSummaryTable } from "./EquipmentSummaryTable";
import { LiveIndicator } from "./LiveIndicator";

interface LiveResponse {
  factory: string;
  windowHours: number;
  measurementCount: number;
  lastIngestIso: string | null;
  firstIngestIso: string | null;
  result: SerializableAnalysisResult;
}

const POLL_MS = 10_000;
const LIVE_WINDOW_SEC = 120;

export function LiveTab() {
  const showToast = useFems((s) => s.showToast);
  const [response, setResponse] = useState<LiveResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [factoryFilter, setFactoryFilter] = useState<string>("");
  const [windowHours, setWindowHours] = useState<number>(24);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const errorToastShown = useRef(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (factoryFilter) params.set("factory", factoryFilter);
      params.set("windowHours", String(windowHours));
      const res = await fetch(`/api/realtime/status?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as LiveResponse;
      setResponse(data);
      setResult(fromSerializable(data.result));
      setError(null);
      errorToastShown.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (!errorToastShown.current) {
        showToast("실시간 로드 실패: " + message, "error");
        errorToastShown.current = true;
      }
    } finally {
      setFetching(false);
    }
  }, [factoryFilter, windowHours, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLive = useMemo(() => {
    if (!response?.lastIngestIso) return false;
    const age = (now - new Date(response.lastIngestIso).getTime()) / 1000;
    return age <= LIVE_WINDOW_SEC;
  }, [response, now]);

  const lastIngestLabel = useMemo(() => {
    if (!response?.lastIngestIso) return "수집 데이터 없음";
    const secs = Math.max(
      0,
      Math.round((now - new Date(response.lastIngestIso).getTime()) / 1000),
    );
    if (secs < 60) return `${secs}초 전`;
    if (secs < 3600) return `${Math.round(secs / 60)}분 전`;
    return new Date(response.lastIngestIso).toLocaleString("ko-KR");
  }, [response, now]);

  return (
    <>
      <div className="panel">
        <div className="flex flex-wrap items-center gap-3">
          <LiveIndicator isLive={isLive} />
          <div className="text-xs text-muted">
            최근 수집:{" "}
            <strong
              className={isLive ? "text-run" : "text-text"}
            >{lastIngestLabel}</strong>
            {response && (
              <>
                {" · "}
                측정값 <strong>{response.measurementCount.toLocaleString()}</strong>건
                {" · "}
                공장 <strong>{response.factory}</strong>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">공장</label>
            <input
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              placeholder="전체"
              className="px-2 py-1 border border-border rounded text-xs min-w-[100px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">윈도우</label>
            <select
              value={windowHours}
              onChange={(e) => setWindowHours(Number(e.target.value))}
              className="px-2 py-1 border border-border rounded text-xs"
            >
              <option value={1}>1h</option>
              <option value={6}>6h</option>
              <option value={24}>24h</option>
              <option value={72}>72h</option>
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            10초마다 갱신
          </label>
          <button
            type="button"
            className="btn btn-secondary text-xs"
            onClick={() => void load()}
            disabled={fetching}
          >
            {fetching ? "조회 중..." : "🔄 새로고침"}
          </button>
        </div>
      </div>

      {error && (
        <div className="panel border-l-4 border-stop">
          <div className="text-sm text-stop font-medium">
            실시간 데이터 로드 실패
          </div>
          <div className="text-xs text-muted mt-1">{error}</div>
        </div>
      )}

      {result && result.equipments.length === 0 && !error && (
        <div className="panel">
          <div className="text-center text-muted text-[13px] py-10">
            지난 {windowHours}시간 내 수집된 측정값이 없습니다.
            <br />
            IoT 게이트웨이에서{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
              POST /api/ingest/current
            </code>
            로 전류 데이터를 전송하면 여기에 실시간 상태가 표시됩니다.
            <br />
            <span className="text-[11px]">
              샘플: <code>{"{ equipmentId, factory, timestamp, ampere }"}</code>
            </span>
          </div>
        </div>
      )}

      {result && result.equipments.length > 0 && (
        <>
          <KpiGrid result={result} />
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusDoughnut result={result} />
            <EquipmentSummaryTable result={result} />
          </div>
          {result.equipments.length > 0 && (
            <div className="text-[11px] text-muted mt-2 text-right">
              윈도우 {response?.windowHours}h · 전체 가동률{" "}
              {fmtPct(result.utilization)}
            </div>
          )}
        </>
      )}
    </>
  );
}
