export const COLORS = {
  run: "#22c55e",
  down: "#f59e0b",
  stop: "#ef4444",
} as const;

export const SHIFT_DAY_START = 7;
export const SHIFT_NIGHT_START = 19;
export const WORK_DAY_START = 7;

export type StatusKey = "run" | "down" | "stop";
export type ShiftKey = "day" | "night";
