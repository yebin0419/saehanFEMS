#!/usr/bin/env node
// 샘플 EMS JSON 생성기
// 24시간(07:00 ~ 익일 07:00) 1분 단위 전류 데이터를 생성합니다.
// 각 설비는 서로 다른 패턴(정상/고장/금형교체/품질 등)을 가지도록 설계되어
// Phase 4 비가동 사유 추천, Phase 3 알림 조건 등 모든 기능이 트리거됩니다.
//
// 사용법:
//   node scripts/generate-sample.mjs
//   → samples/sample-ems.json 파일 생성

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "samples", "sample-ems.json");

// 기준 시각: 어제 07:00 KST (사용자가 쉽게 "오늘 자료"로 쓸 수 있도록)
const BASE_START = new Date();
BASE_START.setHours(7, 0, 0, 0);
BASE_START.setDate(BASE_START.getDate() - 1);
const BASE_END = new Date(BASE_START);
BASE_END.setDate(BASE_END.getDate() + 1);

const FACTORY = "새한A공장";

/**
 * 설비별 특성 프로파일
 * - baseAmpere: 정상 가동 시 평균 전류
 * - noise: 전류 노이즈 폭
 * - stops: [{startMin, durationMin, reason}] 삽입할 Stop 구간
 * - downs: 짧은 Down 구간
 */
const PROFILES = [
  {
    id: "INJ-01",
    name: "사출기 1호",
    baseAmpere: 14.5,
    noise: 1.0,
    stops: [
      { startMin: 300, durationMin: 95, label: "고장 → BREAKDOWN" }, // 11:00~12:35
    ],
    downs: [],
  },
  {
    id: "INJ-02",
    name: "사출기 2호",
    baseAmpere: 12.8,
    noise: 0.8,
    stops: [
      { startMin: 310, durationMin: 55, label: "점심 계획정지 → PLANNED_STOP" }, // 12:10~13:05
      { startMin: 950, durationMin: 50, label: "저녁 계획정지 → PLANNED_STOP" }, // 18:50~19:40
    ],
    downs: [],
  },
  {
    id: "INJ-03",
    name: "사출기 3호",
    baseAmpere: 16.2,
    noise: 1.2,
    stops: [
      { startMin: 180, durationMin: 25, label: "금형교체 → MOLD_CHANGE" }, // 10:00~10:25
      { startMin: 720, durationMin: 30, label: "금형교체 → MOLD_CHANGE" }, // 19:00~19:30
    ],
    downs: [
      { startMin: 60, durationMin: 3, label: "품질 체크 → QUALITY" },
      { startMin: 480, durationMin: 4, label: "품질 체크 → QUALITY" },
    ],
  },
  {
    id: "INJ-04",
    name: "사출기 4호",
    baseAmpere: 11.5,
    noise: 0.7,
    stops: [
      // Stop 없음 - 거의 100% 가동 모범 설비
    ],
    downs: [
      { startMin: 420, durationMin: 15, label: "자재대기 → MATERIAL_WAIT" },
      { startMin: 870, durationMin: 20, label: "자재대기 → MATERIAL_WAIT" },
    ],
  },
  {
    id: "INJ-05",
    name: "사출기 5호",
    baseAmpere: 13.1,
    noise: 0.9,
    stops: [
      { startMin: 0, durationMin: 70, label: "교대 준비 → BREAKDOWN" }, // 07:00~08:10 가동 전
    ],
    downs: [
      { startMin: 240, durationMin: 2, label: "품질 → QUALITY" },
      { startMin: 600, durationMin: 2, label: "품질 → QUALITY" },
      { startMin: 1100, durationMin: 3, label: "품질 → QUALITY" },
    ],
  },
];

function generateSamples(profile) {
  const samples = [];
  const totalMinutes = 24 * 60;
  for (let m = 0; m < totalMinutes; m++) {
    const t = new Date(BASE_START.getTime() + m * 60_000);

    // Stop 구간 내?
    const inStop = profile.stops.find(
      (s) => m >= s.startMin && m < s.startMin + s.durationMin,
    );
    // Down 구간 내?
    const inDown = profile.downs.find(
      (d) => m >= d.startMin && m < d.startMin + d.durationMin,
    );

    let a;
    if (inStop) {
      // Stop: 거의 0A (0.00~0.15)
      a = 0.02 + Math.random() * 0.13;
    } else if (inDown) {
      // Down: 저가동 (0.5~0.95)
      a = 0.5 + Math.random() * 0.45;
    } else {
      // Run: baseAmpere ± noise
      a = profile.baseAmpere + (Math.random() - 0.5) * profile.noise * 2;
    }

    samples.push({
      t: t.toISOString().slice(0, 16), // "YYYY-MM-DDTHH:MM" 포맷
      a: Number(a.toFixed(2)),
    });
  }
  return samples;
}

function build() {
  const payload = {
    meta: {
      factory: FACTORY,
      from: BASE_START.toISOString().slice(0, 16),
      to: BASE_END.toISOString().slice(0, 16),
    },
    equipments: PROFILES.map((p) => ({
      id: p.id,
      name: p.name,
      samples: generateSamples(p),
    })),
  };
  return payload;
}

function main() {
  const payload = build();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload), "utf8");

  // 요약 리포트
  console.log(`샘플 생성 완료 → ${OUT_PATH}`);
  console.log(`  공장: ${FACTORY}`);
  console.log(`  기간: ${payload.meta.from} ~ ${payload.meta.to}`);
  console.log(`  설비: ${payload.equipments.length}대`);
  let totalSamples = 0;
  for (const eq of payload.equipments) {
    totalSamples += eq.samples.length;
    const profile = PROFILES.find((p) => p.id === eq.id);
    const stopMin = profile.stops.reduce((s, x) => s + x.durationMin, 0);
    const downMin = profile.downs.reduce((s, x) => s + x.durationMin, 0);
    const util = ((1440 - stopMin - downMin) / 1440) * 100;
    console.log(
      `    - ${eq.id} ${eq.name}: Stop ${stopMin}분 / Down ${downMin}분 / 예상 가동률 ${util.toFixed(1)}%`,
    );
  }
  console.log(`  총 샘플: ${totalSamples.toLocaleString()}건`);
  console.log(``);
  console.log(`사용 방법:`);
  console.log(`  1) 브라우저에서 Vercel 배포 URL 접속`);
  console.log(`  2) "EMS 전류 (JSON)" 드롭존에 ${OUT_PATH} 끌어다 놓기`);
  console.log(`  3) [분석하기 →] 클릭`);
  console.log(`  4) 모든 탭(개요/시간대/원인/추세·요약)에서 결과 확인`);
  console.log(`  5) [💾 분석 저장]으로 Supabase에 영속화`);
}

main();
