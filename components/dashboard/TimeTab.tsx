"use client";

import type { AnalysisResult } from "@/types/fems";
import { Heatmap } from "./Heatmap";
import { HourlyStackedBar } from "./HourlyStackedBar";

interface Props {
  result: AnalysisResult;
}

export function TimeTab({ result }: Props) {
  return (
    <>
      <Heatmap result={result} />
      <HourlyStackedBar result={result} />
    </>
  );
}
