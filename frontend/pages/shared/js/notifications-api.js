const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

/**
 * Fetch user's notifications with pagination
 */
export async function fetchNotifications(params = {}) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  if (params?.read !== undefined) query.set('read', String(params.read));

  const res = await fetch(`${API_BASE}/api/notifications?${query}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return handleResponse(res);
}

/**
 * Get unread notifications count
 */
export async function fetchUnreadCount() {
  const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return handleResponse(res);
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId) {
  const res = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return handleResponse(res);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return handleResponse(res);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId) {
  const res = await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return handleResponse(res);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  const res = await fetch(`${API_BASE}/api/notifications/clear-all`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return handleResponse(res);
}

function getToken() {
  const raw = localStorage.getItem('authData');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem('authData');
      return '';
    }
    if (parsed.token) return parsed.token;
    if (typeof parsed === 'string') return JSON.parse(parsed).token;
    return '';
  } catch {
    return '';
  }
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}
