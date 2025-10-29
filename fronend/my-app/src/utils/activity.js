// Simple activity log using localStorage
const KEY = 'ot_activity_v1';

export function readActivity() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logActivity(entry) {
  try {
    const items = readActivity();
    const rec = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      time: new Date().toISOString(),
      ...entry,
    };
    items.unshift(rec);
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    // ignore
  }
}

export function clearActivity() {
  try { localStorage.removeItem(KEY); } catch {}
}
