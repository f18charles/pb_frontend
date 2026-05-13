// ============================================================
// utils.js — Shared formatting helpers and UI utilities.
//
// Fixes addressed:
//  - Replaces every alert() / prompt() with non-blocking toast + modal UIs
//  - formatCurrency / formatDate centralized here (no duplicates)
//  - escapeHtml here so every page can use it safely
//  - showToast replaces alert() throughout the app
// ============================================================

// ── Formatting ────────────────────────────────────────────────────────────────

function formatCurrency(amount) {
    return `KES ${(amount || 0).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleDateString('en-KE', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch {
        return '—';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Loading overlay ───────────────────────────────────────────────────────────

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    const app     = document.getElementById('app');
    if (show) {
        if (overlay) overlay.style.display = 'flex';
        if (app)     app.style.display     = 'none';
    } else {
        if (overlay) overlay.style.display = 'none';
        if (app)     app.style.display     = 'block';
    }
}

// ── Toast notifications (replaces alert()) ────────────────────────────────────
// Fix: alert() is blocking and breaks on mobile/iframes. showToast() is
// non-blocking and fits Bootstrap's existing toast component.

function showToast(message, type = 'danger') {
    // Ensure the toast container exists.
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '11000';
        document.body.appendChild(container);
    }

    const id = `toast_${Date.now()}`;
    const icons = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill', info: 'info-circle-fill' };
    const icon  = icons[type] || icons.info;

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${icon} me-2"></i>${escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);

    const el    = document.getElementById(id);
    const toast = new bootstrap.Toast(el, { delay: 4000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ── Generic confirmation modal (replaces confirm()) ───────────────────────────

function showConfirm(message, onConfirm) {
    let modal = document.getElementById('confirmModal');
    if (modal) modal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="confirmModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content rounded-4">
                    <div class="modal-body pt-4 text-center">
                        <i class="bi bi-exclamation-triangle-fill text-warning fs-2 mb-3 d-block"></i>
                        <p class="mb-0">${escapeHtml(message)}</p>
                    </div>
                    <div class="modal-footer border-0 justify-content-center">
                        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-danger btn-sm" id="confirmOkBtn">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    `);

    modal = document.getElementById('confirmModal');
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    document.getElementById('confirmOkBtn').onclick = () => {
        bsModal.hide();
        onConfirm();
    };
    modal.addEventListener('hidden.bs.modal', () => modal.remove(), { once: true });
}

// ── Button loading state (prevents double-submit) ─────────────────────────────
// Fix: disables button and shows spinner while async work is in flight.

function setButtonLoading(btn, loading, originalText) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText || btn.dataset.originalText || 'Save';
    }
}
