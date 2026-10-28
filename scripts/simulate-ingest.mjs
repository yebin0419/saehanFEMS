#!/usr/bin/env node
// Phase 5 수집 시뮬레이터 — 테스트 전용
// 사용법: node scripts/simulate-ingest.mjs [--base=http://localhost:3001] [--factory=Factory-A] [--equipment=EQ-1,EQ-2] [--rate=1] [--duration=60]

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const BASE = args.base || "http://localhost:3001";
const FACTORY = args.factory || "Factory-A";
const EQUIPMENTS = (args.equipment || "EQ-SIM-1,EQ-SIM-2").split(",");
const RATE_HZ = Number(args.rate || "1");
const DURATION_SEC = Number(args.duration || "60");
const KEY = process.env.INGEST_API_KEY || "";

const state = Object.fromEntries(
  EQUIPMENTS.map((id) => [
    id,
    { stopCooldown: 0, baseAmpere: 12 + Math.random() * 4 },
  ]),
);

function nextAmpere(id) {
  const s = state[id];
  // 5% 확률로 Stop 구간 시작 (3~8분 지속)
  if (s.stopCooldown === 0 && Math.random() < 0.01) {
    s.stopCooldown = Math.round(180 + Math.random() * 300);
  }
  if (s.stopCooldown > 0) {
    s.stopCooldown -= 1;
    return 0.02 + Math.random() * 0.1; // Stop
  }
  // 2% 확률로 Down (경부하)
  if (Math.random() < 0.02) return 0.6 + Math.random() * 0.3;
  // Run
  return s.baseAmpere + (Math.random() - 0.5) * 1.5;
}

async function registerEquipments() {
  for (const id of EQUIPMENTS) {
    const res = await fetch(BASE + "/api/equipments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
      },
      body: JSON.stringify({
        id,
        name: `시뮬 설비 ${id}`,
        factory: FACTORY,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[register] ${id} ${res.status} ${body}`);
    } else {
      console.log(`[register] ${id} OK`);
    }
  }
}

async function ingestBatch(items) {
  const res = await fetch(BASE + "/api/ingest/current", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[ingest] ${res.status} ${body}`);
  }
  return res.ok;
}

async function main() {
  console.log(
    `시뮬레이션 시작 · base=${BASE} · 공장=${FACTORY} · 설비=${EQUIPMENTS.join(",")} · ${RATE_HZ}Hz x ${DURATION_SEC}초`,
  );
  await registerEquipments();

  const intervalMs = 1000 / RATE_HZ;
  const endAt = Date.now() + DURATION_SEC * 1000;
  let sent = 0;
  while (Date.now() < endAt) {
    const now = new Date().toISOString();
    const items = EQUIPMENTS.map((id) => ({
      equipmentId: id,
      factory: FACTORY,
      timestamp: now,
      ampere: Number(nextAmpere(id).toFixed(3)),
    }));
    const ok = await ingestBatch(items);
    if (ok) sent += items.length;
    if (sent % 20 === 0) {
      process.stdout.write(`\r전송 ${sent}건...`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log(`\n완료 · 총 ${sent}건 전송`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
