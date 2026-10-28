import type { AnalysisStorage } from "./types";
import { fsAdapter } from "./fs-adapter";
import { createSupabaseAdapter } from "./supabase-adapter";

let singleton: AnalysisStorage | null = null;

export function getStorage(): AnalysisStorage {
  if (singleton) return singleton;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    singleton = createSupabaseAdapter(url, key);
  } else {
    singleton = fsAdapter;
  }
  return singleton;
}

export function storageBackend(): "supabase" | "fs" {
  return process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? "supabase"
    : "fs";
}

export type { AnalysisStorage } from "./types";
