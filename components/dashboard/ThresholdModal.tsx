"use client";

import { useFems } from "@/store/fems";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ThresholdModal({ open, onClose }: Props) {
  const emsRaw = useFems((s) => s.emsRaw);
  const thresholds = useFems((s) => s.thresholds);
  const updateThreshold = useFems((s) => s.updateThreshold);
  const reapply = useFems((s) => s.reapplyThresholds);

  if (!open || !emsRaw) return null;

  const onApply = () => {
    reapply();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-card p-5 w-[90%] max-w-[540px] max-h-[80vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 mb-3 text-base font-semibold">⚙ 상태 판별 임계값</h2>
        <p className="text-xs text-muted m-0">
          전류값이 <strong>Stop 임계값 미만</strong>이면 정지(Stop),
          <br />
          <strong>Stop ≤ 전류 &lt; Run 임계값</strong>이면 저가동(Down),
          <br />
          <strong>Run 임계값 이상</strong>이면 정상 가동(Run)으로 분류합니다.
        </p>

        <div className="mt-3">
          <div className="grid gap-2 text-xs font-semibold text-muted mb-1.5" style={{ gridTemplateColumns: "1fr 90px 90px" }}>
            <div>설비</div>
            <div>Stop 미만 (A)</div>
            <div>Run 이상 (A)</div>
          </div>
          {emsRaw.equipments.map((eq) => {
            const t = thresholds[eq.id] || { stop: 0.5, run: 1.0 };
            return (
              <div
                key={eq.id}
                className="grid gap-2 items-center mb-1.5 text-xs"
                style={{ gridTemplateColumns: "1fr 90px 90px" }}
              >
                <div title={eq.id}>{eq.name || eq.id}</div>
                <input
                  type="number"
                  step="0.1"
                  value={t.stop}
                  onChange={(e) =>
                    updateThreshold(eq.id, { stop: Number(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 border border-border rounded text-xs"
                />
                <input
                  type="number"
                  step="0.1"
                  value={t.run}
                  onChange={(e) =>
                    updateThreshold(eq.id, { run: Number(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 border border-border rounded text-xs"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={onApply}>
            적용 · 재분석
          </button>
        </div>
      </div>
    </div>
  );
}
