// IMPORTANT: Next.js only inlines NEXT_PUBLIC_* env vars into the client bundle when
// they are referenced as STATIC literals (process.env.NEXT_PUBLIC_FOO). A dynamic
// lookup such as process.env[`NEXT_PUBLIC_${key}`] is NOT inlined, so in the browser
// it returns undefined and every base silently falls back to localhost. Each var must
// therefore be spelled out below. With output:'export' these are baked in at BUILD time.
const pick = (value, fallback) => (value && value.trim()) || fallback;

export const MASTER_BASE = () =>
  pick(
    process.env.NEXT_PUBLIC_MASTER_DATA_BASE ||
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE_URL,
    'http://localhost:8091',
  );
export const AUTH_BASE = () => pick(process.env.NEXT_PUBLIC_AUTH_BASE, 'http://localhost:8081');
export const TICKET_BASE = () => pick(process.env.NEXT_PUBLIC_TICKET_BASE, 'http://localhost:8082');
export const USER_BASE = () => pick(process.env.NEXT_PUBLIC_USER_BASE, 'http://localhost:8083');
export const SHOP_BASE = () => pick(process.env.NEXT_PUBLIC_SHOP_BASE, 'http://localhost:8084');
export const TECHNICIAN_BASE = () => pick(process.env.NEXT_PUBLIC_TECHNICIAN_BASE, 'http://localhost:8085');
export const INVENTORY_BASE = () => pick(process.env.NEXT_PUBLIC_INVENTORY_BASE, 'http://localhost:8086');
export const MARKETPLACE_BASE = () => pick(process.env.NEXT_PUBLIC_MARKETPLACE_BASE, 'http://localhost:8087');
export const PICKUP_BASE = () => pick(process.env.NEXT_PUBLIC_PICKUP_BASE, 'http://localhost:8088');
export const NOTIFICATION_BASE = () => pick(process.env.NEXT_PUBLIC_NOTIFICATION_BASE, 'http://localhost:8089');
export const SUBSCRIPTION_BASE = () => pick(process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE, 'http://localhost:8090');
export const ORDER_BASE = () => pick(process.env.NEXT_PUBLIC_ORDER_BASE, 'http://localhost:8092');

async function request(base, path, options = {}) {
  const url = `${base.replace(/\/$/, '')}${path}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const { skipAuthRedirect, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchOptions.headers,
  };
  const res = await fetch(url, { ...fetchOptions, headers });
  if (!res.ok) {
    // Consume the body ONCE as text, then try to parse JSON from it. The old
    // code did `res.json()` then `res.text()` in a catch — both read the same
    // stream, so the second call throws "body stream already read" and the
    // user sees that bogus error instead of the real failure.
    const raw = await res.text().catch(() => '');
    let body = raw;
    if (raw) {
      try { body = JSON.parse(raw); } catch { /* keep raw text */ }
    }

    // Auth failure: drop the (now-invalid) token, surface a friendly message,
    // and kick the user to /management. Callers that hit endpoints which don't
    // require auth (like master-data /master/**) pass skipAuthRedirect:true so
    // a 401 from a misrouted/cold service doesn't bounce the whole page.
    if (res.status === 401 || res.status === 403) {
      if (!skipAuthRedirect && typeof window !== 'undefined') {
        try { localStorage.removeItem('admin_token'); } catch {}
        // The login page IS /management/ and every portal page lives under it
        // (/management/dashboard/, /management/models/, …), so this must be an
        // EXACT match. A startsWith() here would be true everywhere in the
        // portal and the 401 bounce would never fire. trailingSlash:true means
        // the served path has a trailing slash, hence the strip.
        const onLogin = window.location.pathname.replace(/\/+$/, '') === '/management';
        if (!onLogin) {
          const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
          // Defer so the caller's error handler can still run + render the toast.
          setTimeout(() => { window.location.assign(`/management/?returnTo=${returnTo}`); }, 50);
        }
      }
      const where = `${options.method || 'GET'} ${path}`;
      const serverHint = (body && typeof body === 'object' && (body.message || body.error)) || '';
      let msg;
      if (res.status === 401) {
        msg = skipAuthRedirect
          ? `Master service not reachable (401 from ${where})`
          : 'Session expired or not signed in. Redirecting to login…';
      } else {
        // 403
        msg = skipAuthRedirect
          ? `Master service blocked the request (403 from ${where}). The service likely needs a restart.`
          : `You don't have permission to do that. (${where}${serverHint ? ' — ' + serverHint : ''})`;
      }
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      // eslint-disable-next-line no-console
      console.error('[api]', res.status, where, body);
      throw err;
    }

    const apiMsg =
      (body && typeof body === 'object' && (body.message || body.error)) ||
      (typeof body === 'string' && body.trim() ? body : null);
    const err = new Error(
      apiMsg ||
        `${options.method || 'GET'} ${path} failed: ${res.status}${res.statusText ? ' ' + res.statusText : ''}`,
    );
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) return res.json();
  return res.text();
}

// Master-data endpoints are permitAll on the backend (see SecurityConfig).
// We pass skipAuthRedirect so a 401 here never kicks the user to /management —
// most likely cause of a 401 from /master is that the service hasn't been
// restarted with the latest endpoints, or a gateway is misrouting the path.
export const masterApi = {
  get: (path) => request(MASTER_BASE(), path, { skipAuthRedirect: true }),
  post: (path, body) => request(MASTER_BASE(), path, { method: 'POST', body: JSON.stringify(body), skipAuthRedirect: true }),
  put: (path, body) => request(MASTER_BASE(), path, { method: 'PUT', body: JSON.stringify(body), skipAuthRedirect: true }),
  patch: (path, body) => request(MASTER_BASE(), path, { method: 'PATCH', body: JSON.stringify(body), skipAuthRedirect: true }),
  delete: (path) => request(MASTER_BASE(), path, { method: 'DELETE', skipAuthRedirect: true }),
};

export const authApi = {
  get: (path) => request(AUTH_BASE(), path),
  post: (path, body) => request(AUTH_BASE(), path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(AUTH_BASE(), path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(AUTH_BASE(), path, { method: 'DELETE' }),
};

export const ticketApi = {
  get: (path) => request(TICKET_BASE(), path),
  post: (path, body) => request(TICKET_BASE(), path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(TICKET_BASE(), path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(TICKET_BASE(), path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const shopApi = {
  get: (path) => request(SHOP_BASE(), path),
  post: (path, body) => request(SHOP_BASE(), path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(SHOP_BASE(), path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(SHOP_BASE(), path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(SHOP_BASE(), path, { method: 'DELETE' }),
};

export const subscriptionApi = {
  get: (path) => request(SUBSCRIPTION_BASE(), path),
  post: (path, body) => request(SUBSCRIPTION_BASE(), path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(SUBSCRIPTION_BASE(), path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(SUBSCRIPTION_BASE(), path, { method: 'PATCH', body: JSON.stringify(body) }),
};
