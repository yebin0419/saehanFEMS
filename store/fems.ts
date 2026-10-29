"use client";

import { create } from "zustand";
import type {
  AnalysisResult,
  EmsPayload,
  FiltersState,
  MoldRow,
  Threshold,
  ThresholdMap,
} from "@/types/fems";
import { loadEms, loadMoldDetailed } from "@/lib/parse";
import { autoThresholds } from "@/lib/thresholds";
import { analyze } from "@/lib/aggregate";
import { toSerializable, fromSerializable } from "@/lib/storage/types";

interface ToastState {
  message: string;
  kind?: "success" | "error";
  id: number;
}

export type DashboardTab =
  | "overview"
  | "time"
  | "cause"
  | "week"
  | "alerts"
  | "live";

interface FemsState {
  emsFile: File | null;
  moldFiles: File[];
  emsRaw: EmsPayload | null;
  moldRows: MoldRow[];
  thresholds: ThresholdMap;
  analyzed: AnalysisResult | null;
  savedAnalysisId: string | null;
  filters: FiltersState;
  isAnalyzing: boolean;
  toast: ToastState | null;
  activeTab: DashboardTab;
  liveOnlyMode: boolean;

  setEmsFile: (file: File | null) => void;
  addMoldFiles: (files: File[]) => void;
  removeMoldFile: (index: number) => void;
  setFilters: (patch: Partial<FiltersState>) => void;
  updateThreshold: (equipmentId: string, patch: Partial<Threshold>) => void;
  setActiveTab: (tab: DashboardTab) => void;
  enterLiveOnly: () => void;
  exitLiveOnly: () => void;

  runAnalysis: () => Promise<void>;
  reapplyThresholds: () => void;
  reset: () => void;

  saveAnalysis: () => Promise<string | null>;
  loadAnalysis: (id: string) => Promise<boolean>;

  showToast: (message: string, kind?: "success" | "error") => void;
}

const DEFAULT_FILTERS: FiltersState = {
  factory: "",
  equipment: "",
  shift: "",
};

export const useFems = create<FemsState>((set, get) => ({
  emsFile: null,
  moldFiles: [],
  emsRaw: null,
  moldRows: [],
  thresholds: {},
  analyzed: null,
  filters: DEFAULT_FILTERS,
  isAnalyzing: false,
  toast: null,
  activeTab: "overview",
  savedAnalysisId: null,
  liveOnlyMode: false,

  setEmsFile: (file) => set({ emsFile: file }),
  addMoldFiles: (files) =>
    set((s) => ({ moldFiles: [...s.moldFiles, ...files] })),
  removeMoldFile: (index) =>
    set((s) => ({ moldFiles: s.moldFiles.filter((_, i) => i !== index) })),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  updateThreshold: (equipmentId, patch) =>
    set((s) => {
      const current = s.thresholds[equipmentId] || { stop: 0.5, run: 1.0 };
      return {
        thresholds: {
          ...s.thresholds,
          [equipmentId]: { ...current, ...patch },
        },
      };
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  enterLiveOnly: () => set({ liveOnlyMode: true }),
  exitLiveOnly: () => set({ liveOnlyMode: false }),

  runAnalysis: async () => {
    const { emsFile, moldFiles } = get();
    if (!emsFile) return;
    set({ isAnalyzing: true });
    try {
      const emsRaw = await loadEms(emsFile);
      let moldRows: MoldRow[] = [];
      let moldWarning: string | null = null;
      if (moldFiles.length) {
        try {
          const detail = await loadMoldDetailed(moldFiles);
          moldRows = detail.rows;
        } catch (moldErr) {
          // MOLD 파싱 실패는 치명적이지 않다 — EMS 분석은 계속 진행하고
          // 사용자에게 어떤 컬럼이 필요한지만 분명히 알린다.
          moldWarning =
            moldErr instanceof Error ? moldErr.message : String(moldErr);
        }
      }
      const thresholds = autoThresholds(emsRaw);
      const analyzed = analyze(emsRaw, moldRows, thresholds);
      set({
        emsRaw,
        moldRows,
        thresholds,
        analyzed,
        filters: DEFAULT_FILTERS,
        savedAnalysisId: null,
      });
      if (moldWarning) {
        get().showToast(
          `분석 완료 · 설비 ${analyzed.equipments.length}대 (MOLD 파일 인식 실패: ${moldWarning})`,
          "error",
        );
      } else {
        get().showToast(
          `분석 완료 · 설비 ${analyzed.equipments.length}대 · ${moldRows.length}건 생산 데이터`,
          "success",
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().showToast("분석 실패: " + message, "error");
    } finally {
      set({ isAnalyzing: false });
    }
  },

  reapplyThresholds: () => {
    const { emsRaw, moldRows, thresholds } = get();
    if (!emsRaw) return;
    const analyzed = analyze(emsRaw, moldRows, thresholds);
    set({ analyzed });
    get().showToast("임계값을 적용하여 재분석했습니다.", "success");
  },

  reset: () =>
    set({
      emsFile: null,
      moldFiles: [],
      emsRaw: null,
      moldRows: [],
      thresholds: {},
      analyzed: null,
      filters: DEFAULT_FILTERS,
      activeTab: "overview",
      savedAnalysisId: null,
    }),

  saveAnalysis: async () => {
    const { analyzed } = get();
    if (!analyzed) return null;
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: toSerializable(analyzed) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { item: { id: string } };
      set({ savedAnalysisId: data.item.id });
      get().showToast(`분석을 저장했습니다 · ID: ${data.item.id}`, "success");
      return data.item.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().showToast("저장 실패: " + message, "error");
      return null;
    }
  },

  loadAnalysis: async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const result = fromSerializable(data.result);
      set({
        analyzed: result,
        emsRaw: null,
        moldRows: [],
        thresholds: {},
        filters: DEFAULT_FILTERS,
        activeTab: "overview",
        savedAnalysisId: id,
      });
      get().showToast(`저장된 분석을 불러왔습니다 · ${id}`, "success");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().showToast("불러오기 실패: " + message, "error");
      return false;
    }
  },

  showToast: (message, kind) =>
    set({ toast: { message, kind, id: Date.now() } }),
}));
