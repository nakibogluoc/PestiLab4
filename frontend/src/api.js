// frontend/src/api.js
export function apiUrl(path) {
  const rawBase = process.env.REACT_APP_API_URL;
  // Fallback to "/api" if env is missing/undefined
  const base = (!rawBase || rawBase === 'undefined') ? '/api' : rawBase;

  // Normalize slashes
  const b = base.replace(/\/+$/, '');
  const p = String(path).replace(/^\/+/, '');
  return `${b}/${p}`;
}

export async function login(username, password) {
  const res = await fetch(apiUrl('auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    let msg = 'Login failed';
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}
