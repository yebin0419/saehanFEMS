import { Resend } from "resend";
import { fmtDuration, fmtPct } from "@/lib/format";
import type { AlertConfig, AlertViolation } from "./types";

export function hasResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function labelFor(v: AlertViolation): string {
  return v.conditionType === "stop_duration"
    ? "정지 지속 임계 초과"
    : "가동률 기준 미달";
}

function valueFor(v: AlertViolation): string {
  return v.conditionType === "stop_duration"
    ? fmtDuration(v.measuredValue)
    : fmtPct(v.measuredValue);
}

function thresholdFor(v: AlertViolation): string {
  return v.conditionType === "stop_duration"
    ? fmtDuration(v.threshold)
    : fmtPct(v.threshold);
}

export function buildEmail(
  violations: AlertViolation[],
  analysisId: string | null,
): { subject: string; html: string; text: string } {
  const factories = Array.from(new Set(violations.map((v) => v.factory)));
  const subject = `[saehanFEMS] ${violations.length}건 알림 · ${factories.join(", ")}`;
  const rows = violations
    .map(
      (v) => `
        <tr>
          <td style="padding:6px 10px;border:1px solid #e3e7ef">${v.factory}</td>
          <td style="padding:6px 10px;border:1px solid #e3e7ef">${v.equipmentName}</td>
          <td style="padding:6px 10px;border:1px solid #e3e7ef">${labelFor(v)}</td>
          <td style="padding:6px 10px;border:1px solid #e3e7ef;text-align:right">${valueFor(v)}</td>
          <td style="padding:6px 10px;border:1px solid #e3e7ef;text-align:right;color:#6b7280">${thresholdFor(v)}</td>
        </tr>`,
    )
    .join("");

  const linkBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = analysisId && linkBase ? `${linkBase}/?analysis=${analysisId}` : null;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#1f2937;max-width:640px">
      <h2 style="margin:0 0 8px 0;color:#1e3a8a">saehanFEMS 알림</h2>
      <p style="margin:0 0 16px 0;color:#6b7280;font-size:13px">
        아래 설비의 임계값 위반이 감지되었습니다.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:6px 10px;border:1px solid #e3e7ef;text-align:left">공장</th>
            <th style="padding:6px 10px;border:1px solid #e3e7ef;text-align:left">설비</th>
            <th style="padding:6px 10px;border:1px solid #e3e7ef;text-align:left">조건</th>
            <th style="padding:6px 10px;border:1px solid #e3e7ef;text-align:right">측정값</th>
            <th style="padding:6px 10px;border:1px solid #e3e7ef;text-align:right">임계값</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${link ? `<p style="margin-top:16px"><a href="${link}" style="color:#2563eb">대시보드에서 보기 →</a></p>` : ""}
      <p style="margin-top:24px;color:#9ca3af;font-size:11px">자동 발송된 메일입니다 · saehanFEMS</p>
    </div>`;

  const text =
    `[saehanFEMS] 알림 ${violations.length}건\n\n` +
    violations
      .map(
        (v) =>
          `- ${v.factory} / ${v.equipmentName}: ${labelFor(v)} · 측정 ${valueFor(v)} / 임계 ${thresholdFor(v)}`,
      )
      .join("\n");

  return { subject, html, text };
}

export async function sendAlertEmail(
  config: AlertConfig,
  violations: AlertViolation[],
  analysisId: string | null,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  if (config.recipients.length === 0) throw new Error("No recipients configured");

  const from = process.env.ALERT_FROM ?? "saehanFEMS <alerts@example.com>";
  const resend = new Resend(key);
  const { subject, html, text } = buildEmail(violations, analysisId);

  const { error } = await resend.emails.send({
    from,
    to: config.recipients,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(error.message || "Resend send failed");
  }
}
