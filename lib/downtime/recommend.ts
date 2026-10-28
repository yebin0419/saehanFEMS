import type { DowntimeInterval, DowntimeReason } from "./types";

export function recommendReason(interval: DowntimeInterval): DowntimeReason {
  const start = new Date(interval.startIso);
  const hour = start.getHours();
  const minutes = interval.durationMinutes;

  // 식사·휴식 시간대와 겹치는 10분 이상 Stop → 계획정지
  const isMealWindow =
    (hour === 12 && start.getMinutes() === 0) ||
    (hour >= 11 && hour < 13) ||
    (hour >= 18 && hour < 19);
  if (interval.state === "stop" && isMealWindow && minutes >= 20 && minutes <= 70) {
    return "PLANNED_STOP";
  }

  // 매우 짧은 Down (≤ 5분)이면 품질 불량 (단발성 중단으로 추정)
  if (interval.state === "down" && minutes <= 5) {
    return "QUALITY";
  }

  // 긴 Stop (≥ 60분)이면 고장
  if (interval.state === "stop" && minutes >= 60) {
    return "BREAKDOWN";
  }

  // 중간 길이 Stop (15~45분)이면 금형교체로 추정
  if (interval.state === "stop" && minutes >= 15 && minutes < 45) {
    return "MOLD_CHANGE";
  }

  // Down 10~30분 → 자재대기
  if (interval.state === "down" && minutes >= 10 && minutes < 30) {
    return "MATERIAL_WAIT";
  }

  return "UNASSIGNED";
}
