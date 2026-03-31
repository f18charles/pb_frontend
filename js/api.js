const API_BASE = 'https://piggy-bank-lod0.onrender.com/api/v1';

window.api = {
    token: null,
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('piggy_token', token);
    },
    
    clearToken() {
        this.token = null;
        localStorage.removeItem('piggy_token');
    },
    
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                window.auth.logout();
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(data.error || data.message || 'Request failed');
        }
        
        return data;
    },
    
    // Auth endpoints
    login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    register(fullName, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ full_name: fullName, email, password })
        });
    },
    
    getProfile() {
        return this.request('/auth/profile');
    },
    
    // Accounts
    getAccounts() {
        return this.request('/accounts');
    },
    
    createAccount(data) {
        return this.request('/accounts', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Transactions
    getTransactions() {
        return this.request('/transactions');
    },
    
    createTransaction(data) {
        return this.request('/transactions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    exportTransactions(format) {
        return fetch(`${API_BASE}/transactions/export?format=${format}`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
    },
    
    // Categories
    getCategories() {
        return this.request('/categories');
    },
    
    createCategory(data) {
        return this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Budgets
    getBudgets() {
        return this.request('/budgets');
    },
    
    createBudget(data) {
        return this.request('/budgets', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Goals
    getGoals() {
        return this.request('/goals');
    },
    
    createGoal(data) {
        return this.request('/goals', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Insights
    getOverview() {
        return this.request('/insights/overview');
    },
    
    getMonthlySummary() {
        return this.request('/insights/summary/monthly');
    },
    
    getSpendingInsights(days = 90) {
        return this.request(`/insights/spending?days=${days}`);
    }
};