import type { EmsPayload, Threshold, ThresholdMap } from "@/types/fems";

export function autoThresholds(ems: EmsPayload): ThresholdMap {
  const map: ThresholdMap = {};
  ems.equipments.forEach((eq) => {
    const vals = (eq.samples || [])
      .map((s) => Number(s.a) || 0)
      .filter((v) => v > 0.1);
    if (vals.length === 0) {
      map[eq.id] = { stop: 0.5, run: 1.0 };
      return;
    }
    vals.sort((a, b) => a - b);
    const p75 = vals[Math.floor(vals.length * 0.75)];
    map[eq.id] = {
      stop: 0.5,
      run: Math.max(0.5, Number((p75 * 0.7).toFixed(2))),
    };
  });
  return map;
}

export function classify(a: number, threshold: Threshold): "run" | "down" | "stop" {
  if (a < threshold.stop) return "stop";
  if (a < threshold.run) return "down";
  return "run";
}
