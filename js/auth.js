window.auth = {
    isAuthenticated() {
        return !!window.api.token;
    },
    
    async login(email, password) {
        const response = await window.api.login(email, password);
        const { token, user } = response.data;
        window.api.setToken(token);
        return user;
    },
    
    async register(fullName, email, password) {
        const response = await window.api.register(fullName, email, password);
        const { token, user } = response.data;
        window.api.setToken(token);
        return user;
    },
    
    logout() {
        window.api.clearToken();
        localStorage.removeItem('piggy_token');
        window.location.reload();
    },
    
    async getCurrentUser() {
        const response = await window.api.getProfile();
        return response.data;
    }
};