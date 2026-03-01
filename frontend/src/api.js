const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchBills(parliament, session) {
  const params = new URLSearchParams();
  if (parliament) params.set('parliament', parliament);
  if (session) params.set('session', session);
  const qs = params.toString();
  return request(`/bills${qs ? `?${qs}` : ''}`);
}

export async function ingestBill(billNumber, parliamentSession) {
  const ps = parliamentSession ? `?parliament_session=${encodeURIComponent(parliamentSession)}` : '';
  return request(`/ingest/bill/${encodeURIComponent(billNumber)}${ps}`, { method: 'POST' });
}

export async function ingestDebates(billNumber, parliamentSession) {
  const ps = parliamentSession ? `?parliament_session=${encodeURIComponent(parliamentSession)}` : '';
  return request(`/ingest/debates/${encodeURIComponent(billNumber)}${ps}`, { method: 'POST' });
}

export async function ingestGazette(maxEntries = 20) {
  return request(`/ingest/gazette?max_entries=${maxEntries}`, { method: 'POST' });
}

export async function ingestAll(billNumber, parliamentSession) {
  const ps = parliamentSession ? `?parliament_session=${encodeURIComponent(parliamentSession)}` : '';
  return request(`/ingest/all/${encodeURIComponent(billNumber)}${ps}`, { method: 'POST' });
}

export async function chat(message, billNumber, parliamentSession) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      bill_number: billNumber || null,
      parliament_session: parliamentSession || null,
    }),
  });
}

export async function getStats() {
  return request('/stats');
}

export async function healthCheck() {
  return request('/health');
}
