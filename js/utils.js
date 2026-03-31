// Utility functions
window.showLoading = function(show, message = 'Loading...') {
    const overlay = document.getElementById('globalLoading');
    const container = document.getElementById('appContainer');
    
    if (show) {
        if (overlay) overlay.style.display = 'flex';
        if (container) container.style.display = 'none';
    } else {
        if (overlay) overlay.style.display = 'none';
        if (container) container.style.display = 'block';
    }
};

window.formatCurrency = function(amount) {
    return `KES ${amount.toFixed(2)}`;
};

window.formatDate = function(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE');
};

window.getErrorMessage = function(error) {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return 'An unexpected error occurred';
};