"use client";

import { useFems } from "@/store/fems";
import { Dropzone } from "./Dropzone";
import { FileChip } from "./FileChip";
import { HelpBox } from "./HelpBox";
import { RecentAnalyses } from "./RecentAnalyses";

export function UploadView() {
  const emsFile = useFems((s) => s.emsFile);
  const moldFiles = useFems((s) => s.moldFiles);
  const isAnalyzing = useFems((s) => s.isAnalyzing);
  const setEmsFile = useFems((s) => s.setEmsFile);
  const addMoldFiles = useFems((s) => s.addMoldFiles);
  const removeMoldFile = useFems((s) => s.removeMoldFile);
  const runAnalysis = useFems((s) => s.runAnalysis);
  const enterLiveOnly = useFems((s) => s.enterLiveOnly);

  return (
    <div className="grid gap-5">
      <div className="card">
        <h2 className="m-0 mb-3 text-[15px] font-semibold">1. 자료 올리기</h2>
        <p className="text-xs text-muted mb-3">
          EMS 전류 JSON은 필수, MOLD 생산 실적은 선택입니다. 파일은 PC 브라우저
          내부에서만 분석됩니다.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Dropzone
              icon="📊"
              label="EMS 전류 (JSON) · 필수"
              sublabel="1분 단위 전류 데이터 · 클릭하거나 파일을 끌어다 놓으세요"
              accept=".json,application/json"
              onFiles={(files) => setEmsFile(files[0] || null)}
            />
            <div className="mt-3 grid gap-1.5">
              {emsFile && (
                <FileChip file={emsFile} onRemove={() => setEmsFile(null)} />
              )}
            </div>
          </div>
          <div>
            <Dropzone
              icon="📦"
              label="MOLD 생산 실적 (Excel/CSV) · 선택"
              sublabel="부서별 파일 다중 선택 가능"
              accept=".xls,.xlsx,.csv"
              multiple
              onFiles={addMoldFiles}
            />
            <div className="mt-3 grid gap-1.5">
              {moldFiles.map((f, i) => (
                <FileChip
                  key={`${f.name}-${i}`}
                  file={f}
                  onRemove={() => removeMoldFile(i)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-5">
          <button
            type="button"
            className="btn btn-primary btn-large"
            disabled={!emsFile || isAnalyzing}
            onClick={() => void runAnalysis()}
          >
            {isAnalyzing ? "분석 중..." : "분석하기 →"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-large"
            onClick={enterLiveOnly}
            title="수집된 IoT 측정값을 분석 없이 바로 모니터링"
          >
            📡 실시간 모니터링
          </button>
        </div>
      </div>

      <RecentAnalyses />
      <HelpBox />
    </div>
  );
}
