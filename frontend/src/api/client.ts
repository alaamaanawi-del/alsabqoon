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

// Get current local timestamp (in local timezone, not UTC)
export function getCurrentLocalTimestamp(): string {
  try {
    // Create date in local timezone and format it properly
    const now = new Date();
    
    // Format as local ISO string with timezone offset
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    // Get timezone offset in minutes and convert to ±HH:MM format
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`;
  } catch (error) {
    console.warn('Could not get current local timestamp:', error);
    // Fallback to UTC but log the issue
    return new Date().toISOString();
  }
}

// Get current local date string (YYYY-MM-DD in local timezone)
export function getCurrentLocalDateString(): string {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Could not get current local date:', error);
    // Fallback to UTC date
    return new Date().toISOString().split('T')[0];
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

export async function getAzkarRange(startDate: string, endDate: string): Promise<{
  start_date: string;
  end_date: string;
  total_range: number;
  azkar_summary: Record<number, { count: number; sessions: number; percentage: number }>;
  entries: ZikrEntry[];
}> {
  return getJson(`/azkar/range/${startDate}/${endDate}`);
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

export async function getCharityRange(startDate: string, endDate: string): Promise<{
  start_date: string;
  end_date: string;
  total_range: number;
  charity_summary: Record<number, { count: number; sessions: number; percentage: number }>;
  entries: CharityEntry[];
}> {
  return getJson(`/charities/range/${startDate}/${endDate}`);
}