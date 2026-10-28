"use client";

import { useEffect, useState } from "react";
import { useFems } from "@/store/fems";
import { DEFAULT_CONFIG, type AlertConfig } from "@/lib/alerts/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AlertConfigModal({ open, onClose }: Props) {
  const showToast = useFems((s) => s.showToast);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [recipientsText, setRecipientsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/alerts/config");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as AlertConfig;
        setConfig(data);
        setRecipientsText(data.recipients.join(", "));
      } catch (err) {
        showToast(
          "알림 설정 로드 실패: " + (err instanceof Error ? err.message : String(err)),
          "error",
        );
        setConfig({ ...DEFAULT_CONFIG });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, showToast]);

  if (!open) return null;

  const update = (patch: Partial<AlertConfig>) => {
    setConfig((prev) => ({ ...(prev ?? DEFAULT_CONFIG), ...patch }));
  };

  const onApply = async () => {
    if (!config) return;
    const recipients = recipientsText
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: AlertConfig = { ...config, recipients };
    setSaving(true);
    try {
      const res = await fetch("/api/alerts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      showToast("알림 설정을 저장했습니다.", "success");
      onClose();
    } catch (err) {
      showToast(
        "저장 실패: " + (err instanceof Error ? err.message : String(err)),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-card p-5 w-[90%] max-w-[520px] max-h-[80vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 mb-3 text-base font-semibold">🔔 알림 조건 · 수신자</h2>
        <p className="text-xs text-muted m-0 mb-3">
          분석 저장 시 아래 조건을 평가하고, 수신자에게 Resend 이메일을 발송합니다.
          쿨다운 내 동일 조건은 발송을 건너뜁니다.
        </p>

        {loading || !config ? (
          <div className="text-xs text-muted py-6 text-center">불러오는 중...</div>
        ) : (
          <div className="grid gap-3">
            <Field label="조건 A — 정지(Stop) 누적 (분)">
              <input
                type="number"
                min={0}
                step={1}
                value={config.maxStopMinutes}
                onChange={(e) => update({ maxStopMinutes: Number(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-border rounded text-sm"
              />
              <p className="text-[11px] text-muted m-0 mt-1">
                설비 Stop 누적이 이 값 이상이면 알림. 0이면 비활성.
              </p>
            </Field>

            <Field label="조건 B — 가동률 하한 (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(config.minUtilization * 100)}
                onChange={(e) =>
                  update({ minUtilization: (Number(e.target.value) || 0) / 100 })
                }
                className="w-full px-2 py-1 border border-border rounded text-sm"
              />
              <p className="text-[11px] text-muted m-0 mt-1">
                가동률이 이 값 미만이면 알림. 0이면 비활성.
              </p>
            </Field>

            <Field label="쿨다운 (분)">
              <input
                type="number"
                min={0}
                step={1}
                value={config.cooldownMinutes}
                onChange={(e) =>
                  update({ cooldownMinutes: Number(e.target.value) || 0 })
                }
                className="w-full px-2 py-1 border border-border rounded text-sm"
              />
              <p className="text-[11px] text-muted m-0 mt-1">
                동일 설비·조건에 대해 재발송을 억제하는 시간.
              </p>
            </Field>

            <Field label="수신자 이메일 (쉼표 구분)">
              <textarea
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                className="w-full px-2 py-1 border border-border rounded text-sm font-mono"
                rows={3}
                placeholder="ops@example.com, manager@example.com"
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onApply()}
            disabled={saving || loading}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-muted font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}
