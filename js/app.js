// ============================================================
// app.js — Application bootstrap and auth modal.
//
// Fixes addressed:
//  - Was 0 bytes — now fully implemented
//  - Single initialisation path (no duplicate logic in index.html)
//  - Auth modal is proper Bootstrap modal with inline validation,
//    no alert() / prompt() calls
//  - Session-expired event from api.js triggers re-login gracefully
//  - Logout sends the refresh token to the backend for revocation
// ============================================================

// ── Session expiry handler ────────────────────────────────────────────────────

window.addEventListener('pb:session-expired', () => {
    showToast('Your session has expired. Please log in again.', 'info');
    Auth.clear();
    showAuthModal();
});

// ── Auth modal ────────────────────────────────────────────────────────────────

function showAuthModal() {
    showLoading(false);

    const app = document.getElementById('app');
    if (app) app.style.display = 'none';

    const existing = document.getElementById('authModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="authModal" tabindex="-1"
             data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content rounded-4">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title w-100 text-center pt-2">
                            <i class="bi bi-piggy-bank-fill text-success me-2"></i>Piggy Bank
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-secondary py-2 px-3 mb-3 small">
                            Try the demo: <strong>demo@email.com</strong> / <strong>demo1234</strong>
                        </div>

                        <ul class="nav nav-tabs mb-3" id="authTab" role="tablist">
                            <li class="nav-item flex-fill text-center">
                                <button class="nav-link active w-100" data-bs-toggle="tab"
                                        data-bs-target="#loginPanel" type="button">Sign In</button>
                            </li>
                            <li class="nav-item flex-fill text-center">
                                <button class="nav-link w-100" data-bs-toggle="tab"
                                        data-bs-target="#registerPanel" type="button">Register</button>
                            </li>
                        </ul>

                        <div class="tab-content">
                            <!-- Login -->
                            <div class="tab-pane fade show active" id="loginPanel">
                                <div id="loginError" class="alert alert-danger py-2 small d-none"></div>
                                <input type="email" id="loginEmail" class="form-control mb-2"
                                       placeholder="Email address" autocomplete="email">
                                <input type="password" id="loginPassword" class="form-control mb-3"
                                       placeholder="Password" autocomplete="current-password">
                                <button class="btn btn-success w-100" id="doLoginBtn">Sign In</button>
                            </div>

                            <!-- Register -->
                            <div class="tab-pane fade" id="registerPanel">
                                <div id="registerError" class="alert alert-danger py-2 small d-none"></div>
                                <input type="text" id="regName" class="form-control mb-2"
                                       placeholder="Full name" autocomplete="name">
                                <input type="email" id="regEmail" class="form-control mb-2"
                                       placeholder="Email address" autocomplete="email">
                                <input type="password" id="regPassword" class="form-control mb-3"
                                       placeholder="Password (min 8 characters)" autocomplete="new-password">
                                <button class="btn btn-outline-success w-100" id="doRegisterBtn">Create Account</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    const modalEl = document.getElementById('authModal');
    const modal   = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    modal.show();

    // ── Login ──
    document.getElementById('doLoginBtn').onclick = async (e) => {
        const btn      = e.currentTarget;
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errBox   = document.getElementById('loginError');

        errBox.classList.add('d-none');
        if (!email || !password) {
            errBox.textContent = 'Please enter your email and password.';
            errBox.classList.remove('d-none');
            return;
        }

        const originalText = btn.innerHTML;
        setButtonLoading(btn, true);
        showLoading(true);
        try {
            await apiLogin(email, password);
            modal.hide();
            modalEl.remove();
            await initApp();
        } catch (err) {
            showLoading(false);
            errBox.textContent = err.message;
            errBox.classList.remove('d-none');
            setButtonLoading(btn, false, originalText);
        }
    };

    // Allow Enter key to submit login.
    ['loginEmail', 'loginPassword'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('doLoginBtn').click();
        });
    });

    // ── Register ──
    document.getElementById('doRegisterBtn').onclick = async (e) => {
        const btn      = e.currentTarget;
        const name     = document.getElementById('regName').value.trim();
        const email    = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const errBox   = document.getElementById('registerError');

        errBox.classList.add('d-none');
        if (!name || !email || password.length < 8) {
            errBox.textContent = 'Please fill all fields. Password must be at least 8 characters.';
            errBox.classList.remove('d-none');
            return;
        }

        const originalText = btn.innerHTML;
        setButtonLoading(btn, true);
        showLoading(true);
        try {
            await apiRegister(name, email, password);
            modal.hide();
            modalEl.remove();
            await initApp();
        } catch (err) {
            showLoading(false);
            errBox.textContent = err.message;
            errBox.classList.remove('d-none');
            setButtonLoading(btn, false, originalText);
        }
    };
}

// ── App initialisation ────────────────────────────────────────────────────────

async function initApp() {
    showLoading(true);
    try {
        const profileRes = await apiFetch('/auth/profile');
        const user = profileRes.data;

        document.getElementById('userEmail').textContent = user.email || user.full_name || '';

        // Wire up sidebar navigation.
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                loadPage(link.dataset.page);
            };
        });

        // Logo → dashboard.
        document.getElementById('logoLink').onclick = (e) => {
            e.preventDefault();
            loadPage('dashboard');
        };

        // Logout.
        document.getElementById('logoutBtn').onclick = async () => {
            await apiLogout();
            showAuthModal();
        };

        showLoading(false);
        await loadPage('dashboard');

    } catch (err) {
        showLoading(false);
        Auth.clear();
        showAuthModal();
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

if (Auth.isLoggedIn) {
    initApp();
} else {
    showLoading(false);
    showAuthModal();
}
