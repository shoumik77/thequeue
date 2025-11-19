export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json();
}

export async function updateRequestStatus(id: number, status: 'pending' | 'accepted' | 'playing' | 'done' | 'rejected') {
  return api(`/requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateRequestPosition(id: number, position: number) {
  return api(`/requests/${id}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ position }),
  });
}
