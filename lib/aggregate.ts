import type {
  AnalysisResult,
  EmsPayload,
  EquipmentAggregate,
  FiltersState,
  MoldRow,
  StatusBuckets,
  ThresholdMap,
} from "@/types/fems";
import { classify } from "./thresholds";
import { parseTimestamp } from "./format";
import {
  classifyShift,
  shiftForWorkHour,
  workDayLabel,
  workDayMinuteOffset,
} from "./workday";
import {
  type DowntimeInterval,
  estimateKwhLoss,
} from "./downtime/types";

function emptyBuckets(): StatusBuckets {
  return { run: 0, down: 0, stop: 0 };
}

export function analyze(
  ems: EmsPayload,
  moldRows: MoldRow[],
  thresholds: ThresholdMap,
): AnalysisResult {
  const moldByEq: Record<string, number> = {};
  let totalMold = 0;
  moldRows.forEach((r) => {
    moldByEq[r.equipmentId] = (moldByEq[r.equipmentId] || 0) + r.quantity;
    totalMold += r.quantity;
  });

  const hourly: Record<number, StatusBuckets> = {};
  for (let h = 0; h < 24; h++) hourly[h] = emptyBuckets();
  const shift = { day: emptyBuckets(), night: emptyBuckets() };
  const workDays = new Set<string>();

  const equipments: EquipmentAggregate[] = [];
  let totalMinutes = 0;
  let totalRun = 0;
  let totalDown = 0;
  let totalStop = 0;

  ems.equipments.forEach((eq) => {
    const th = thresholds[eq.id] || { stop: 0.5, run: 1.0 };
    const samples = (eq.samples || [])
      .map((s) => ({ date: parseTimestamp(s.t), a: Number(s.a) || 0 }))
      .filter((s) => !isNaN(s.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const eqHourly: Record<number, StatusBuckets> = {};
    for (let h = 0; h < 24; h++) eqHourly[h] = emptyBuckets();

    let eqRun = 0;
    let eqDown = 0;
    let eqStop = 0;
    let runAmpereSum = 0;

    interface IntervalBuffer {
      startIso: string;
      endIso: string;
      lastDate: Date;
      state: "down" | "stop";
      ampereSum: number;
      minutes: number;
    }
    const intervals: DowntimeInterval[] = [];
    let buf: IntervalBuffer | null = null;

    const flush = () => {
      if (!buf) return;
      const avg = buf.minutes > 0 ? buf.ampereSum / buf.minutes : 0;
      intervals.push({
        id: `${eq.id}__${buf.startIso}`,
        equipmentId: eq.id,
        startIso: buf.startIso,
        endIso: buf.endIso,
        durationMinutes: buf.minutes,
        state: buf.state,
        avgAmpere: Number(avg.toFixed(3)),
        estimatedKwhLoss: estimateKwhLoss(
          Math.max(0, th.run - avg),
          buf.minutes,
        ),
      });
      buf = null;
    };

    samples.forEach((s) => {
      const state = classify(s.a, th);
      if (state === "run") {
        eqRun += 1;
        runAmpereSum += s.a;
      } else if (state === "down") eqDown += 1;
      else eqStop += 1;

      const workMinute = workDayMinuteOffset(s.date);
      const workHour = Math.floor(workMinute / 60);
      if (workHour >= 0 && workHour < 24) {
        eqHourly[workHour][state] += 1;
        hourly[workHour][state] += 1;
      }

      const sh = classifyShift(s.date);
      shift[sh][state] += 1;

      workDays.add(workDayLabel(s.date));

      if (state === "run") {
        flush();
      } else {
        const iso = s.date.toISOString();
        if (!buf || buf.state !== state) {
          flush();
          buf = {
            startIso: iso,
            endIso: iso,
            lastDate: s.date,
            state,
            ampereSum: s.a,
            minutes: 1,
          };
        } else {
          buf.endIso = iso;
          buf.lastDate = s.date;
          buf.ampereSum += s.a;
          buf.minutes += 1;
        }
      }
    });
    flush();

    const eqTotal = eqRun + eqDown + eqStop;
    const avgRunAmpere = eqRun > 0 ? Number((runAmpereSum / eqRun).toFixed(3)) : 0;
    const agg: EquipmentAggregate = {
      id: eq.id,
      name: eq.name || eq.id,
      factory: eq.factory || ems.meta?.factory || "미지정",
      run: eqRun,
      down: eqDown,
      stop: eqStop,
      total: eqTotal,
      threshold: th,
      hourly: eqHourly,
      utilization: eqTotal > 0 ? eqRun / eqTotal : 0,
      moldQty: moldByEq[eq.id] || 0,
      avgRunAmpere,
      downtimeIntervals: intervals,
    };
    equipments.push(agg);
    totalMinutes += eqTotal;
    totalRun += eqRun;
    totalDown += eqDown;
    totalStop += eqStop;
  });

  let moldFirst12 = 0;
  let moldLast12 = 0;
  moldRows.forEach((r) => {
    if (!r.date) return;
    let dt = r.date;
    if (r.startTime) {
      try {
        if (r.startTime instanceof Date) dt = r.startTime;
        else {
          const base = new Date(r.date);
          const parts = String(r.startTime).split(":").map(Number);
          const hh = parts[0];
          const mm = parts[1];
          if (!isNaN(hh)) {
            base.setHours(hh, mm || 0, 0, 0);
            dt = base;
          }
        }
      } catch {
        /* noop */
      }
    }
    const wm = workDayMinuteOffset(dt);
    if (wm < 720) moldFirst12 += r.quantity;
    else moldLast12 += r.quantity;
  });

  return {
    factory: ems.meta?.factory || "미지정",
    from: ems.meta?.from,
    to: ems.meta?.to,
    equipments,
    workDays,
    hourly,
    shift,
    totalMinutes,
    totalRun,
    totalDown,
    totalStop,
    utilization: totalMinutes > 0 ? totalRun / totalMinutes : 0,
    totalMold,
    moldByEq,
    moldFirst12,
    moldLast12,
  };
}

export function applyFilters(
  result: AnalysisResult,
  filters: FiltersState,
): AnalysisResult {
  const equipments = result.equipments
    .filter((eq) => {
      if (filters.factory && eq.factory !== filters.factory) return false;
      if (filters.equipment && eq.id !== filters.equipment) return false;
      return true;
    })
    .map((eq) => ({
      ...eq,
      hourly: Object.fromEntries(
        Object.entries(eq.hourly).map(([h, b]) => [h, { ...b }]),
      ) as Record<number, StatusBuckets>,
      downtimeIntervals: eq.downtimeIntervals.map((i) => ({ ...i })),
    }));

  const hourly: Record<number, StatusBuckets> = {};
  for (let h = 0; h < 24; h++) hourly[h] = emptyBuckets();
  const shift = { day: emptyBuckets(), night: emptyBuckets() };

  let totalRun = 0;
  let totalDown = 0;
  let totalStop = 0;

  equipments.forEach((eq) => {
    let eqRun = 0;
    let eqDown = 0;
    let eqStop = 0;
    for (let h = 0; h < 24; h++) {
      const shiftOfHour = shiftForWorkHour(h);
      if (filters.shift && filters.shift !== shiftOfHour) continue;
      const hour = eq.hourly[h];
      eqRun += hour.run;
      eqDown += hour.down;
      eqStop += hour.stop;
      hourly[h].run += hour.run;
      hourly[h].down += hour.down;
      hourly[h].stop += hour.stop;
      shift[shiftOfHour].run += hour.run;
      shift[shiftOfHour].down += hour.down;
      shift[shiftOfHour].stop += hour.stop;
    }
    const eqTotal = eqRun + eqDown + eqStop;
    eq.run = eqRun;
    eq.down = eqDown;
    eq.stop = eqStop;
    eq.total = eqTotal;
    eq.utilization = eqTotal > 0 ? eqRun / eqTotal : 0;
    totalRun += eqRun;
    totalDown += eqDown;
    totalStop += eqStop;
  });

  const totalMinutes = totalRun + totalDown + totalStop;
  return {
    ...result,
    equipments,
    hourly,
    shift,
    totalMinutes,
    totalRun,
    totalDown,
    totalStop,
    utilization: totalMinutes > 0 ? totalRun / totalMinutes : 0,
  };
}
