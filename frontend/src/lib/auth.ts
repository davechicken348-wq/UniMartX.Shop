export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller' | 'admin';
  avatar?: string | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  error?: string | { message?: string };
  data?: T;
}

export async function postApi<T>(path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach UniMartX. Check your connection and try again.');
  }

  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok || body.success === false) {
    const message = typeof body.error === 'string'
      ? body.error
      : body.message || (typeof body.error === 'object' ? body.error.message : undefined);
    throw new Error(message || 'Something went wrong. Please try again.');
  }
  return (body.data ?? body) as T;
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem('unimartxToken', token);
  localStorage.setItem('unimartxUser', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('unimartx:auth-change'));
}

export function clearSession() {
  localStorage.removeItem('unimartxToken');
  localStorage.removeItem('unimartxUser');
  window.dispatchEvent(new CustomEvent('unimartx:auth-change'));
}
