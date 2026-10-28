export function isIngestAuthorized(req: Request): boolean {
  const key = process.env.INGEST_API_KEY;
  if (!key) return true; // dev: 미설정 시 허용 (운영에서는 반드시 설정)
  const header =
    req.headers.get("authorization") || req.headers.get("x-ingest-key");
  if (!header) return false;
  const expected = `Bearer ${key}`;
  return header === expected || header === key;
}
