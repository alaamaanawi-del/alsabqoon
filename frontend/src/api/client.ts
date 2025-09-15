import Constants from "expo-constants";

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backendUrl || "";

function api(path: string) {
  const url = `${baseUrl}/api${path}`.replace(/\/+api\//, "/api/");
  return url;
}

// Get device timezone
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not get device timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

// Get current local timestamp
export function getCurrentLocalTimestamp(): string {
  try {
    return new Date().toISOString();
  } catch (error) {
    console.warn('Could not get current timestamp:', error);
    return new Date().toISOString();
  }
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
    timezone: getDeviceTimezone(), // Include device timezone
    client_timestamp: getCurrentLocalTimestamp(), // Include exact client timestamp
  });
}

export async function updateZikrEntry(
  entryId: string,
  count: number,
  editNote?: string
): Promise<{ success: boolean; entry: ZikrEntry }> {
  const res = await fetch(api(`/azkar/entry/${entryId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      count: count,
      edit_note: editNote,
      timezone: getDeviceTimezone(), // Include device timezone for edit timestamp
      client_timestamp: getCurrentLocalTimestamp(), // Include exact client timestamp
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { success: boolean; entry: ZikrEntry };
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

// Charity Types
export interface Charity {
  id: number;
  nameAr: string;
  nameEn: string;
  nameEs: string;
  color: string;
  description: string;
}

export interface CharityEntry {
  id: string;
  user_id: string;
  charity_id: number;
  count: number;
  date: string;
  timestamp: string;
  comments?: string;
  edit_notes?: string[];
}

export interface CharityStats {
  charity_id: number;
  total_count: number;
  total_sessions: number;
  last_entry?: string;
}

export interface DailyCharitySummary {
  date: string;
  total_daily: number;
  charity_summary: Record<number, { count: number; sessions: number; percentage: number }>;
  entries: CharityEntry[];
}

// Charity API Functions
export async function getCharityList(): Promise<{ charities: Charity[] }> {
  return getJson<{ charities: Charity[] }>("/charities");
}

export async function createCharityEntry(
  charityId: number,
  count: number,
  date: string,
  comments?: string
): Promise<CharityEntry> {
  return postJson<CharityEntry>("/charities/entry", {
    charity_id: charityId,
    count: count,
    date: date,
    comments: comments || "",
    timezone: getDeviceTimezone(), // Include device timezone
    client_timestamp: getCurrentLocalTimestamp(), // Include exact client timestamp
  });
}

export async function updateCharityEntry(
  entryId: string,
  count: number,
  comments?: string,
  editNote?: string
): Promise<{ success: boolean; entry: CharityEntry }> {
  const res = await fetch(api(`/charities/entry/${entryId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      count: count,
      comments: comments || "",
      edit_note: editNote,
      timezone: getDeviceTimezone(), // Include device timezone for edit timestamp
      client_timestamp: getCurrentLocalTimestamp(), // Include exact client timestamp
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { success: boolean; entry: CharityEntry };
}

export async function getCharityHistory(
  charityId: number,
  days: number = 30
): Promise<{ entries: CharityEntry[] }> {
  return getJson<{ entries: CharityEntry[] }>(`/charities/${charityId}/history?days=${days}`);
}

export async function getCharityStats(charityId: number): Promise<CharityStats> {
  return getJson<CharityStats>(`/charities/${charityId}/stats`);
}

export async function getDailyCharity(date: string): Promise<DailyCharitySummary> {
  return getJson<DailyCharitySummary>(`/charities/daily/${date}`);
}