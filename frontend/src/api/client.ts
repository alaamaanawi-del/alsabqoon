import Constants from "expo-constants";

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backendUrl || "";

function api(path: string) {
  const url = `${baseUrl}/api${path}`.replace(/\/+api\//, "/api/");
  return url;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(api(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(api(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Azkar Types
export interface Zikr {
  id: number;
  nameAr: string;
  nameEn: string;
  color: string;
}

export interface ZikrEntry {
  id: string;
  user_id: string;
  zikr_id: number;
  count: number;
  date: string;
  timestamp: string;
}

export interface ZikrStats {
  zikr_id: number;
  total_count: number;
  total_sessions: number;
  last_entry?: string;
}

export interface DailyAzkarSummary {
  date: string;
  total_daily: number;
  azkar_summary: Record<number, { count: number; sessions: number; percentage: number }>;
  entries: ZikrEntry[];
}

// Azkar API Functions
export async function getAzkarList(): Promise<{ azkar: Zikr[] }> {
  return getJson<{ azkar: Zikr[] }>("/azkar");
}

export async function createZikrEntry(
  zikrId: number,
  count: number,
  date: string
): Promise<ZikrEntry> {
  return postJson<ZikrEntry>("/azkar/entry", {
    zikr_id: zikrId,
    count: count,
    date: date,
  });
}

export async function getZikrHistory(
  zikrId: number,
  days: number = 30
): Promise<{ entries: ZikrEntry[] }> {
  return getJson<{ entries: ZikrEntry[] }>(`/azkar/${zikrId}/history?days=${days}`);
}

export async function getZikrStats(zikrId: number): Promise<ZikrStats> {
  return getJson<ZikrStats>(`/azkar/${zikrId}/stats`);
}

export async function getDailyAzkar(date: string): Promise<DailyAzkarSummary> {
  return getJson<DailyAzkarSummary>(`/azkar/daily/${date}`);
}