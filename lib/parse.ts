import * as XLSX from "xlsx";
import type { EmsPayload, MoldRow } from "@/types/fems";
import { parseTimestamp } from "./format";

export async function loadEms(file: File): Promise<EmsPayload> {
  const text = await file.text();
  const data = JSON.parse(text) as EmsPayload;
  if (!data.equipments || !Array.isArray(data.equipments)) {
    throw new Error('EMS JSON 포맷이 올바르지 않습니다. "equipments" 배열이 필요합니다.');
  }
  return data;
}

function normalizeMoldRow(
  r: Record<string, unknown>,
  fileName: string,
  sheetName: string,
): MoldRow | null {
  const pick = (keys: string[]) => {
    for (const k of keys) {
      for (const col in r) {
        if (
          col &&
          col.toString().replace(/\s/g, "").toLowerCase() === k.toLowerCase()
        ) {
          return r[col];
        }
      }
    }
    return null;
  };
  const eqId = pick(["설비id", "설비ID", "equipmentid", "equipid", "설비", "eq"]);
  const date = pick(["일자", "날짜", "date"]);
  const start = pick(["시작시각", "start", "starttime"]);
  const end = pick(["종료시각", "end", "endtime"]);
  const qty = pick(["수량", "qty", "quantity", "개수"]);
  const dept = pick(["부서", "department", "dept"]) || sheetName || fileName;

  if (!eqId || qty == null) return null;
  return {
    equipmentId: String(eqId).trim(),
    date: date ? parseTimestamp(date) : null,
    startTime: (start as string | number | Date | null) ?? null,
    endTime: (end as string | number | Date | null) ?? null,
    quantity: Number(qty) || 0,
    department: String(dept).trim(),
    source: fileName,
  };
}

export async function loadMold(files: File[]): Promise<MoldRow[]> {
  const rows: MoldRow[] = [];
  for (const f of files) {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
      });
      data.forEach((r) => {
        const row = normalizeMoldRow(r, f.name, sheetName);
        if (row) rows.push(row);
      });
    }
  }
  return rows;
}
