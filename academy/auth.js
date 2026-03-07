/**
 * HACKERSPHERE ACADEMY AUTHENTICATION UTILITIES
 * Authentication state management for academy features
 */

// ============================================================================
// AUTH STATE MANAGER
// ============================================================================

class AcademyAuth {
  constructor() {
    this.user = null;
    this.token = null;
    this.isLoggedIn = false;
    this.listeners = [];
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Initialize authentication state from storage
   */
  async init() {
    const storedToken = localStorage.getItem('academy_token');
    const storedUser = localStorage.getItem('academy_user');

    if (storedToken && storedUser) {
      try {
        this.token = storedToken;
        this.user = JSON.parse(storedUser);

        // Verify token is still valid by making a test request
        await window.AcademyAPI.authenticatedFetch('/academy/dashboard');
        this.isLoggedIn = true;
        window.AcademyAPI.setToken(storedToken);
      } catch (error) {
        console.warn('Stored token invalid, clearing auth state');
        this.clearAuth();
      }
    }

    this.notifyListeners();
  }

  /**
   * Set user authentication data
   * @param {Object} user - User data
   * @param {string} token - JWT token
   */
  setAuth(user, token) {
    this.user = user;
    this.token = token;
    this.isLoggedIn = true;

    // Store in localStorage for persistence
    localStorage.setItem('academy_user', JSON.stringify(user));
    localStorage.setItem('academy_token', token);

    // Update API client
    window.AcademyAPI.setToken(token);

    this.notifyListeners();
  }

  /**
   * Clear authentication state
   */
  clearAuth() {
    this.user = null;
    this.token = null;
    this.isLoggedIn = false;

    // Clear storage
    localStorage.removeItem('academy_user');
    localStorage.removeItem('academy_token');

    // Clear API client
    window.AcademyAPI.removeToken();

    this.notifyListeners();
  }

  /**
   * Check if user is authenticated and has required role
   * @param {string} requiredRole - Optional role requirement
   * @returns {boolean} Authentication status
   */
  isAuthenticated(requiredRole = null) {
    if (!this.isLoggedIn) return false;

    if (requiredRole && (!this.user || this.user.role !== requiredRole)) {
      return false;
    }

    return true;
  }

  /**
   * Get current user data
   * @returns {Object|null} User data or null if not authenticated
   */
  getUser() {
    return this.user;
  }

  /**
   * Get JWT token
   * @returns {string|null} JWT token or null if not authenticated
   */
  getToken() {
    return this.token;
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  /**
   * Add authentication state change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove authentication state change listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.isLoggedIn, this.user));
  }

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

  /**
   * Require authentication for current route
   * @param {string} redirectTo - Optional redirect path
   */
  requireAuth(redirectTo = '/login') {
    if (!this.isAuthenticated()) {
      Utils.showToast('Authentication required', 'error');
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  /**
   * Redirect authenticated users away from auth pages
   * @param {string} redirectTo - Default redirect destination
   */
  redirectIfAuthenticated(redirectTo = '/academy') {
    if (this.isAuthenticated()) {
      window.location.href = redirectTo;
      return true;
    }
    return false;
  }

  // ============================================================================
  // USER ACTIONS
  // ============================================================================

  /**
   * Simulate login (replace with actual auth flow later)
   * @param {string} username - Username for demo
   * @param {string} password - Password for demo
   */
  async login(username, password) {
    try {
      // TODO: Replace with actual authentication endpoint
      // For now, create mock data
      const mockUser = {
        id: '1',
        username: username || 'demo',
        email: `${username || 'demo'}@hackersphere.com`,
        role: 'student',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };

      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      this.setAuth(mockUser, mockToken);
      Utils.showToast('Login successful', 'success');
      return { user: mockUser, token: mockToken };

    } catch (error) {
      console.error('Login error:', error);
      Utils.showToast('Login failed', 'error');
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    this.clearAuth();
    Utils.showToast('Logged out successfully', 'success');

    // Redirect to home page
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }
}

// ============================================================================
// GLOBAL UTILITIES
// ============================================================================

/**
 * Global authentication helpers
 */
window.AuthHelpers = {
  /**
   * Check authentication and redirect if not authenticated
   */
  checkAuth() {
    if (!academyAuth.isAuthenticated()) {
      Utils.showToast('Please log in to access the academy', 'error');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return false;
    }
    return true;
  },

  /**
   * Initialize required authentication for academy pages
   */
  requireAcademyAuth() {
    if (typeof academyAuth === 'undefined') {
      console.error('AcademyAuth not initialized');
      return false;
    }

    return academyAuth.requireAuth();
  }
};

// ============================================================================
// INSTANCE AND EXPORTS
// ============================================================================

const academyAuth = new AcademyAuth();

// Export globally
window.AcademyAuth = academyAuth;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  academyAuth.init();
});
