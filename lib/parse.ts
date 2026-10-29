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

// 사용자가 쓸 수 있는 컬럼명 변형들. 공백 제거 + 소문자 비교 기준.
// 각 필드는 (1) 정확히 일치하는 별칭 집합, (2) 포함 매칭용 키워드 집합을 가진다.
const COLUMN_ALIASES = {
  equipmentId: {
    exact: [
      "설비id",
      "설비ID",
      "equipmentid",
      "equipid",
      "equipment",
      "equip",
      "설비",
      "설비명",
      "설비번호",
      "호기",
      "호기번호",
      "machine",
      "machineid",
      "machinename",
      "machineno",
      "line",
      "라인",
      "라인id",
      "eq",
      "eqid",
    ],
    contains: ["설비", "호기", "machine", "equip", "라인"],
  },
  date: {
    exact: [
      "일자",
      "날짜",
      "일시",
      "date",
      "datetime",
      "생산일",
      "생산일자",
      "생산일시",
      "작업일",
      "작업일자",
      "operationdate",
      "workdate",
    ],
    contains: ["일자", "날짜", "일시", "date"],
  },
  startTime: {
    exact: [
      "시작시각",
      "시작시간",
      "start",
      "starttime",
      "startat",
      "시작",
      "시작일시",
    ],
    contains: ["시작", "start"],
  },
  endTime: {
    exact: [
      "종료시각",
      "종료시간",
      "end",
      "endtime",
      "endat",
      "종료",
      "종료일시",
    ],
    contains: ["종료", "end"],
  },
  quantity: {
    exact: [
      "수량",
      "qty",
      "quantity",
      "개수",
      "생산량",
      "생산수량",
      "생산수",
      "제품수량",
      "제품수",
      "produced",
      "prodqty",
      "prodcount",
      "count",
      "ea",
      "출수량",
    ],
    contains: ["수량", "생산량", "qty", "quantity", "개수", "produced"],
  },
  department: {
    exact: [
      "부서",
      "department",
      "dept",
      "파트",
      "팀",
      "공정",
      "section",
      "team",
    ],
    contains: ["부서", "파트", "공정", "dept", "team"],
  },
} as const;

type FieldKey = keyof typeof COLUMN_ALIASES;

const normalizeKey = (s: unknown): string =>
  String(s ?? "")
    .toString()
    .replace(/\s+/g, "")
    .replace(/[()[\]{}]/g, "")
    .toLowerCase();

/**
 * 레코드에서 지정된 필드에 해당하는 컬럼 값을 추출한다.
 * 1단계: 정확히 일치하는 별칭 매칭
 * 2단계: 핵심 키워드 포함 매칭 (예: "생산수량(개)" → "수량" 포함 → qty)
 */
function pickField(
  row: Record<string, unknown>,
  field: FieldKey,
): unknown {
  const aliases = COLUMN_ALIASES[field];
  const normalizedExact = aliases.exact.map((a) => a.toLowerCase());
  for (const col in row) {
    const key = normalizeKey(col);
    if (normalizedExact.includes(key)) return row[col];
  }
  for (const col in row) {
    const key = normalizeKey(col);
    for (const kw of aliases.contains) {
      if (key.includes(kw.toLowerCase())) return row[col];
    }
  }
  return null;
}

function normalizeMoldRow(
  r: Record<string, unknown>,
  fileName: string,
  sheetName: string,
): MoldRow | null {
  const eqId = pickField(r, "equipmentId");
  const qty = pickField(r, "quantity");
  const date = pickField(r, "date");
  const start = pickField(r, "startTime");
  const end = pickField(r, "endTime");
  const dept = pickField(r, "department") || sheetName || fileName;

  if (eqId == null || String(eqId).trim() === "") return null;
  if (qty == null || qty === "") return null;
  const qtyNum = Number(qty);
  if (!Number.isFinite(qtyNum)) return null;

  return {
    equipmentId: String(eqId).trim(),
    date: date ? parseTimestamp(date) : null,
    startTime: (start as string | number | Date | null) ?? null,
    endTime: (end as string | number | Date | null) ?? null,
    quantity: qtyNum,
    department: String(dept).trim(),
    source: fileName,
  };
}

/**
 * 시트의 1~4번째 행 중 어떤 행을 헤더로 삼아야 가장 많은 유효 행이 나오는지
 * 자동 탐지. 공장 생산 보고서는 상단에 "YYYY-MM-DD 생산 일보" 같은 메타 행이
 * 종종 끼어 있어, 헤더가 1행이 아닌 경우가 흔하다.
 */
function parseSheet(
  sheet: XLSX.WorkSheet,
  fileName: string,
  sheetName: string,
): { rows: MoldRow[]; totalDataRows: number } {
  let best: { rows: MoldRow[]; totalDataRows: number } = {
    rows: [],
    totalDataRows: 0,
  };

  for (let headerRow = 0; headerRow < 4; headerRow++) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    if (matrix.length <= headerRow) break;

    const headers = (matrix[headerRow] as unknown[]).map((h) =>
      h == null ? "" : String(h),
    );
    if (!headers.some((h) => h.trim())) continue;

    const dataRows = matrix.slice(headerRow + 1).filter((row) => {
      if (!Array.isArray(row)) return false;
      return row.some((v) => v !== null && v !== undefined && v !== "");
    });

    const parsedRows: MoldRow[] = [];
    for (const row of dataRows) {
      const record: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (h) record[h] = (row as unknown[])[i] ?? null;
      });
      const normalized = normalizeMoldRow(record, fileName, sheetName);
      if (normalized) parsedRows.push(normalized);
    }

    if (parsedRows.length > best.rows.length) {
      best = { rows: parsedRows, totalDataRows: dataRows.length };
    }
  }

  return best;
}

export interface MoldLoadResult {
  rows: MoldRow[];
  diagnostics: {
    fileName: string;
    parsed: number;
    totalDataRows: number;
    sheets: string[];
  }[];
}

export async function loadMoldDetailed(files: File[]): Promise<MoldLoadResult> {
  const rows: MoldRow[] = [];
  const diagnostics: MoldLoadResult["diagnostics"] = [];

  for (const f of files) {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });

    let fileParsed = 0;
    let fileDataRows = 0;
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const { rows: sheetRows, totalDataRows } = parseSheet(
        sheet,
        f.name,
        sheetName,
      );
      rows.push(...sheetRows);
      fileParsed += sheetRows.length;
      fileDataRows += totalDataRows;
    }
    diagnostics.push({
      fileName: f.name,
      parsed: fileParsed,
      totalDataRows: fileDataRows,
      sheets: wb.SheetNames,
    });
  }

  if (files.length > 0 && rows.length === 0) {
    const names = diagnostics.map((d) => d.fileName).join(", ");
    throw new Error(
      `MOLD 파일에서 유효한 생산 데이터를 찾지 못했습니다 (${names}). ` +
        `시트에 "설비ID"(또는 설비명/호기/machine)와 "수량"(또는 생산량/qty) ` +
        `컬럼이 있는지, 헤더가 1~4번째 행 안에 위치하는지 확인해주세요. ` +
        `지원하는 컬럼명 예시: 설비ID·호기·machineid / 수량·생산량·qty / ` +
        `일자·일시·date / 시작시각·start / 종료시각·end / 부서·공정·dept.`,
    );
  }

  return { rows, diagnostics };
}

// 기존 API 유지 (하위 호환)
export async function loadMold(files: File[]): Promise<MoldRow[]> {
  const { rows } = await loadMoldDetailed(files);
  return rows;
}
