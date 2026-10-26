export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export async function request(path, options = {}) {
  const token = localStorage.getItem('waynet_token');
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(API_BASE + path, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = (Array.isArray(data) && data.join('، ')) || data?.detail || (data && Object.entries(data).map(([k,v]) => k + ': ' + (Array.isArray(v) ? v.join('، ') : v)).join(' — ')) || 'خطا در ارتباط با سرور';
    throw new Error(message);
  }
  return data;
}
export const get = path => request(path);
export const post = (path, data = {}) => request(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) });
export const remove = path => request(path, { method: 'DELETE' });
export const api = { home: () => get('/home/'), courses: () => get('/courses/'), course: id => get('/courses/' + id + '/'),
  dashboard: () => get('/dashboard/'), adminDashboard: () => get('/admin/dashboard/'),
  login: data => post('/auth/login/', data), register: data => post('/auth/register/', data) };
