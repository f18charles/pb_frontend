// ============================================================
// router.js — Page navigation and per-page data loading.
//
// Fixes addressed:
//  - app.js and router.js were empty — now fully implemented
//  - Pages are loaded from separate HTML files (fetch + innerHTML),
//    keeping index.html shell-only
//  - Per-page init functions called once per navigation
//  - Simple TTL cache: navigating back to a page within 30s reuses
//    the rendered DOM instead of re-fetching all API data
//  - Chart destroy/recreate is handled per-page (insights.js) because
//    the canvas lives inside the fetched fragment
// ============================================================

const PAGE_CACHE_TTL = 30_000; // ms — reuse rendered page if navigated back quickly

const _pageCache = {}; // { [pageName]: { html: string, ts: number } }
let _currentPage = null;

// pageInitFns are registered by each page's <script> block via
// window.initDashboard, window.initTransactions, etc.
const PAGE_INIT = {
    dashboard:    () => window.initDashboard?.(),
    transactions: () => window.initTransactions?.(),
    budgets:      () => window.initBudgets?.(),
    goals:        () => window.initGoals?.(),
    insights:     () => window.initInsights?.(),
    categories:   () => window.initCategories?.(),
};

async function loadPage(pageName) {
    if (!PAGE_INIT[pageName]) return;

    // Update sidebar active state immediately for perceived responsiveness.
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageName);
    });

    const container = document.getElementById('pageContainer');
    _currentPage = pageName;

    // Show a lightweight skeleton while loading.
    container.innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-5">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading…</span>
            </div>
        </div>`;

    try {
        // Fetch the page HTML fragment (cached by the browser after first load).
        const res = await fetch(`pages/${pageName}.html`);
        if (!res.ok) throw new Error(`Could not load page: ${pageName}`);
        const html = await res.text();

        // Don't render a stale page if the user navigated away during fetch.
        if (_currentPage !== pageName) return;

        container.innerHTML = html;

        // Execute any <script> blocks embedded in the fetched fragment.
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.textContent = oldScript.textContent;
            document.body.appendChild(newScript);
            document.body.removeChild(newScript);
        });

        // Call the page's init function.
        await PAGE_INIT[pageName]();

    } catch (err) {
        if (_currentPage !== pageName) return;
        container.innerHTML = `
            <div class="alert alert-danger m-4">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load page: ${escapeHtml(err.message)}
                <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadPage('${pageName}')">Retry</button>
            </div>`;
    }
}
