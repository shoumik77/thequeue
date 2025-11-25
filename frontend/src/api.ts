export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Store the auth token in memory (you might want to use a more secure storage in production)
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  
  // Add content type for non-GET requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method || '')) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }
  
  // Add auth token if available
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // Only include body if it's not undefined (GET/HEAD requests)
    ...(init.body ? { body: init.body } : {}),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  // Handle empty responses (like 204 No Content)
  if (res.status === 204) {
    return undefined as unknown as T;
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

export function wsUrlForSession(sessionId: number) {
  const base = API_BASE.replace(/\/$/, '');
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/ws/sessions/${sessionId}`;
}

// Admin API functions
export interface AdminSession {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  request_count: number;
  dj_name: string | null;
}

export async function fetchSessions(): Promise<{ sessions: AdminSession[] }> {
  return api<{ sessions: AdminSession[] }>('/admin/sessions');
}

export async function endSession(sessionId: number): Promise<void> {
  return api(`/admin/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export function getSessionUrl(slug: string): string {
  return `${window.location.origin}/s/${slug}`;
}
