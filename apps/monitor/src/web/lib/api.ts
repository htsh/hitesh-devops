const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getOverview: () => get<any>("/dashboard/overview"),
  getServices: () => get<any[]>("/dashboard/services"),
  getTargets: () => get<any[]>("/dashboard/targets"),
  getOutages: () => get<any[]>("/dashboard/outages"),
  getServiceDetail: (key: string) => get<any>(`/dashboard/services/${key}`),
  getTargetDetail: (id: string) => get<any>(`/dashboard/targets/${id}`),
  createTarget: (data: any) => post<any>("/targets", data),
  updateTarget: (id: string, data: any) => patch<any>(`/targets/${id}`, data),
  toggleTarget: (id: string, enabled: boolean) => post<any>(`/targets/${id}/toggle`, { enabled }),
  runTarget: (id: string) => post<any>(`/targets/${id}/run`),
};
