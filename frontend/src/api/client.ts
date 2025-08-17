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