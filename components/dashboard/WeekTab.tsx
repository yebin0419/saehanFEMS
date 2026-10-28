"use client";

import type { AnalysisResult } from "@/types/fems";
import { DetailTable } from "./DetailTable";
import { TrendTab } from "./TrendTab";

interface Props {
  result: AnalysisResult;
}

export function WeekTab({ result }: Props) {
  return (
    <>
      <TrendTab result={result} />
      <DetailTable result={result} />
    </>
  );
}
