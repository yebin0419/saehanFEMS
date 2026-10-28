import {
  SHIFT_DAY_START,
  SHIFT_NIGHT_START,
  WORK_DAY_START,
  type ShiftKey,
} from "./constants";

export function workDayLabel(date: Date): string {
  const d = new Date(date);
  if (d.getHours() < WORK_DAY_START) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function workDayMinuteOffset(date: Date): number {
  const d = new Date(date);
  let h = d.getHours();
  if (h < WORK_DAY_START) h += 24;
  return (h - WORK_DAY_START) * 60 + d.getMinutes();
}

export function classifyShift(date: Date): ShiftKey {
  const h = date.getHours();
  return h >= SHIFT_DAY_START && h < SHIFT_NIGHT_START ? "day" : "night";
}

export function shiftForWorkHour(workHourOffset: number): ShiftKey {
  const realHour = (workHourOffset + WORK_DAY_START) % 24;
  return realHour >= SHIFT_DAY_START && realHour < SHIFT_NIGHT_START
    ? "day"
    : "night";
}
