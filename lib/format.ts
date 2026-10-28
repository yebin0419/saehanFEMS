export function fmtDuration(mins: number): string {
  if (!mins) return "0분";
  if (mins < 60) return mins.toFixed(0) + "분";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}시간 ${m}분`;
}

export function fmtPct(ratio: number): string {
  if (!isFinite(ratio)) return "-";
  return (ratio * 100).toFixed(1) + "%";
}

export function parseTimestamp(t: unknown): Date {
  const d = new Date(t as string);
  if (!isNaN(d.getTime())) return d;
  return new Date(String(t).replace(" ", "T"));
}
