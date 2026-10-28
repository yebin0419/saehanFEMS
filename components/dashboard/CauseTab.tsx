"use client";

import type { AnalysisResult } from "@/types/fems";
import { ParetoChart } from "./ParetoChart";
import { ShiftChart } from "./ShiftChart";
import { MoldChart } from "./MoldChart";
import { DowntimeTagging } from "./DowntimeTagging";

interface Props {
  result: AnalysisResult;
}

export function CauseTab({ result }: Props) {
  return (
    <>
      <ParetoChart result={result} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ShiftChart result={result} />
        <MoldChart result={result} />
      </div>
      <DowntimeTagging result={result} />
    </>
  );
}
