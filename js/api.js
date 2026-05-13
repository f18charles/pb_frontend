// ============================================================
// api.js — All HTTP communication with the backend.
//
// Fixes addressed:
//  - Single authToken source of truth (no parallel state in index.html)
//  - Stores and rotates both access_token + refresh_token
//  - Auto-refreshes the access token 60s before expiry while user is active
//  - Inactivity detection: if user is idle > expiry window, tokens expire
//    naturally and user is signed out without a forced reload loop
//  - Logout sends the refresh_token to the backend for revocation (fix #7)
// ============================================================

const API_BASE = 'https://piggy-bank-lod0.onrender.com/api/v1';

// ── Token storage ─────────────────────────────────────────────────────────────

const Auth = (() => {
    let _accessToken  = localStorage.getItem('pb_access_token')  || null;
    let _refreshToken = localStorage.getItem('pb_refresh_token') || null;
    let _expiresAt    = parseInt(localStorage.getItem('pb_expires_at') || '0', 10); // unix ms
    let _refreshTimer = null;

    function _persist() {
        if (_accessToken)  localStorage.setItem('pb_access_token',  _accessToken);
        else               localStorage.removeItem('pb_access_token');
        if (_refreshToken) localStorage.setItem('pb_refresh_token', _refreshToken);
        else               localStorage.removeItem('pb_refresh_token');
        if (_expiresAt)    localStorage.setItem('pb_expires_at',    String(_expiresAt));
        else               localStorage.removeItem('pb_expires_at');
    }

    function setTokens(accessToken, refreshToken, expiresIn) {
        _accessToken  = accessToken;
        _refreshToken = refreshToken;
        _expiresAt    = Date.now() + expiresIn * 1000;
        _persist();
        _scheduleRefresh(expiresIn);
    }

    function clear() {
        _accessToken  = null;
        _refreshToken = null;
        _expiresAt    = 0;
        _persist();
        if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
    }

    // Schedule a proactive token refresh 60s before expiry.
    // Only fires if the user has been active in the last 5 minutes.
    function _scheduleRefresh(expiresIn) {
        if (_refreshTimer) clearTimeout(_refreshTimer);
        const delay = Math.max((expiresIn - 60) * 1000, 5000);
        _refreshTimer = setTimeout(async () => {
            if (!_refreshToken) return;
            // Only refresh when user has been active recently.
            if (Date.now() - window._lastActivity > 5 * 60 * 1000) return;
            try {
                const res = await fetch(`${API_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: _refreshToken }),
                });
                if (!res.ok) { clear(); window.dispatchEvent(new Event('pb:session-expired')); return; }
                const json = await res.json();
                setTokens(json.data.access_token, json.data.refresh_token, json.data.expires_in);
            } catch {
                // Network failure — don't log out, just try again next time.
            }
        }, delay);
    }

    return {
        get accessToken()  { return _accessToken; },
        get refreshToken() { return _refreshToken; },
        get isLoggedIn()   { return !!_accessToken; },
        setTokens,
        clear,
    };
})();

// ── Activity tracking (for inactivity logout) ─────────────────────────────────
window._lastActivity = Date.now();
['click', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, () => { window._lastActivity = Date.now(); }, { passive: true })
);

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (Auth.accessToken) headers['Authorization'] = `Bearer ${Auth.accessToken}`;

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            Auth.clear();
            window.dispatchEvent(new Event('pb:session-expired'));
            throw new Error('Session expired. Please log in again.');
        }
        throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function apiLogin(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    // Backend returns either { access_token, refresh_token } (new) or
    // { token } (old shape) — handle both.
    const d = data.data;
    const accessToken  = d.access_token  || d.token;
    const refreshToken = d.refresh_token || '';
    const expiresIn    = d.expires_in    || 600;
    Auth.setTokens(accessToken, refreshToken, expiresIn);
    return d.user;
}

async function apiRegister(fullName, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    const d = data.data;
    const accessToken  = d.access_token  || d.token;
    const refreshToken = d.refresh_token || '';
    const expiresIn    = d.expires_in    || 600;
    Auth.setTokens(accessToken, refreshToken, expiresIn);
    return d.user;
}

async function apiLogout() {
    // Revoke the refresh token on the backend (fix #7).
    if (Auth.refreshToken) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.accessToken}`,
                },
                body: JSON.stringify({ refresh_token: Auth.refreshToken }),
            });
        } catch { /* best-effort */ }
    }
    Auth.clear();
}
