/**
 * HACKERSPHERE API MANAGER
 * Global API coordinator managing shared resources and cross-API functionality
 */

// ============================================================================
// API MANAGER CLASS
// ============================================================================

class ApiManager {
    constructor() {
        this.academyAPI = null;
        this.shopAPI = null;
        this.isInitialized = false;

        // Global error handling
        this.errorHandlers = new Set();
        this.loadingStates = new Map();

        // Cross-API coordination
        this.pendingRequests = new Set();
        this.requestQueue = [];
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize the API manager with all available APIs
     */
    static async init() {
        if (this.isInitialized) return this;

        // Wait for APIs to be available
        await this.waitForAPIs();

        // Create instance if not exists
        if (!window.apiManager) {
            window.apiManager = new ApiManager();
        }

        const instance = window.apiManager;

        // Store API references
        instance.academyAPI = window.AcademyAPI;
        instance.shopAPI = window.ShopAPI;

        instance.isInitialized = true;

        // Setup global error interception
        instance.setupGlobalErrorHandling();

        // Setup cross-API coordination
        instance.setupCrossApiCoordination();

        console.log('ApiManager initialized successfully');
        return instance;
    }

    /**
     * Wait for all APIs to be loaded
     */
    static async waitForAPIs() {
        const apis = [
            this.waitForGlobal('AcademyAPI'),
            this.waitForGlobal('ShopAPI')
        ];

        return Promise.all(apis);
    }

    /**
     * Wait for a global variable to be defined
     */
    static waitForGlobal(globalName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const checkExist = () => {
                if (window[globalName]) {
                    resolve(window[globalName]);
                } else if (timeout <= 0) {
                    reject(new Error(`Timeout waiting for ${globalName}`));
                } else {
                    timeout -= 100;
                    setTimeout(checkExist, 100);
                }
            };
            checkExist();
        });
    }

    /**
     * Setup global error handling for all APIs
     */
    setupGlobalErrorHandling() {
        // Intercept fetch requests for global error handling
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);

                // Check for API errors
                if (response.status >= 400) {
                    const errorData = await response.clone().json().catch(() => ({}));
                    this.handleApiError({
                        status: response.status,
                        statusText: response.statusText,
                        data: errorData,
                        url: response.url
                    });
                }

                return response;
            } catch (error) {
                this.handleApiError(error);
                throw error;
            }
        };

        // Global unhandled error handler
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && this.isApiError(event.reason)) {
                event.preventDefault();
                this.handleApiError(event.reason);
            }
        });
    }

    /**
     * Setup cross-API coordination and state management
     */
    setupCrossApiCoordination() {
        // Synchronize authentication state between APIs
        if (this.academyAPI && this.shopAPI) {
            // If one API has a token, sync it to the other
            const academyToken = this.academyAPI.loadToken();
            const shopToken = this.shopAPI.loadToken();

            if (academyToken && !shopToken) {
                this.shopAPI.setToken(academyToken);
            } else if (shopToken && !academyToken) {
                this.academyAPI.setToken(shopToken);
            }

            // Setup token synchronization
            this.setupTokenSync();
        }

        // Setup shared loading states
        this.setupSharedLoadingStates();
    }

    /**
     * Setup token synchronization between APIs
     */
    setupTokenSync() {
        // Override setToken methods to sync between APIs
        const originalAcademySetToken = this.academyAPI.setToken.bind(this.academyAPI);
        const originalShopSetToken = this.shopAPI.setToken.bind(this.shopAPI);

        this.academyAPI.setToken = (token) => {
            originalAcademySetToken(token);
            if (this.shopAPI && !this.shopAPI.isAuthenticated()) {
                originalShopSetToken(token);
            }
        };

        this.shopAPI.setToken = (token) => {
            originalShopSetToken(token);
            if (this.academyAPI && !this.academyAPI.isAuthenticated()) {
                originalAcademySetToken(token);
            }
        };

        // Do the same for removeToken
        const originalAcademyRemoveToken = this.academyAPI.removeToken.bind(this.academyAPI);
        const originalShopRemoveToken = this.shopAPI.removeToken.bind(this.shopAPI);

        this.academyAPI.removeToken = () => {
            originalAcademyRemoveToken();
            if (this.shopAPI) originalShopRemoveToken();
        };

        this.shopAPI.removeToken = () => {
            originalShopRemoveToken();
            if (this.academyAPI) originalAcademyRemoveToken();
        };
    }

    /**
     * Setup shared loading states across APIs
     */
    setupSharedLoadingStates() {
        // Create shared loading state management
        this.sharedLoadingStates = new Map();

        // Add utility methods to APIs
        if (this.academyAPI) {
            this.academyAPI.showGlobalLoading = (key, message) => this.showGlobalLoading(key, message);
            this.academyAPI.hideGlobalLoading = (key) => this.hideGlobalLoading(key);
        }

        if (this.shopAPI) {
            this.shopAPI.showGlobalLoading = (key, message) => this.showGlobalLoading(key, message);
            this.shopAPI.hideGlobalLoading = (key) => this.hideGlobalLoading(key);
        }
    }

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    /**
     * Check if an error is an API error
     */
    isApiError(error) {
        return error && (
            error.status ||
            error.message?.includes('HTTP') ||
            error.message?.includes('fetch') ||
            error.message?.includes('NetworkError')
        );
    }

    /**
     * Handle API errors globally
     */
    async handleApiError(error) {
        // Determine error type and handle accordingly
        if (this.isNetworkError(error)) {
            await this.handleNetworkError(error);
        } else if (this.isAuthError(error)) {
            await this.handleAuthError(error);
        } else if (this.isServerError(error)) {
            await this.handleServerError(error);
        }

        // Notify registered error handlers
        this.errorHandlers.forEach(handler => {
            try {
                handler(error);
            } catch (e) {
                console.error('Error in error handler:', e);
            }
        });

        // Show user-friendly error notification
        this.showErrorNotification(error);
    }

    /**
     * Check if error is a network error
     */
    isNetworkError(error) {
        return error.message?.includes('Failed to fetch') ||
               error.message?.includes('NetworkError') ||
               error.message?.includes('No internet connection') ||
               !navigator.onLine;
    }

    /**
     * Check if error is an authentication error
     */
    isAuthError(error) {
        return error.status === 401 ||
               error.status === 403 ||
               error.message?.includes('401') ||
               error.message?.includes('403') ||
               error.message?.includes('Unauthorized') ||
               error.message?.includes('Forbidden');
    }

    /**
     * Check if error is a server error
     */
    isServerError(error) {
        return error.status >= 500 ||
               error.message?.includes('500') ||
               error.message?.includes('503') ||
               error.message?.includes('Server temporarily unavailable');
    }

    /**
     * Handle network errors
     */
    async handleNetworkError(error) {
        // Queue requests for retry when network is restored
        if (!navigator.onLine) {
            this.queueRequestsForRetry();
            this.showOfflineNotification();
        }

        // Retry failed requests when connection is restored
        window.addEventListener('online', () => {
            this.retryQueuedRequests();
            this.showOnlineNotification();
        });
    }

    /**
     * Handle authentication errors
     */
    async handleAuthError(error) {
        // Check both APIs for authentication
        const isAcademyAuth = this.academyAPI?.isAuthenticated();
        const isShopAuth = this.shopAPI?.isAuthenticated();

        if (isAcademyAuth || isShopAuth) {
            // Token expired - redirect to login
            this.redirectToLogin();
        } else {
            // Not authenticated - show login prompt
            this.showLoginPrompt();
        }
    }

    /**
     * Handle server errors
     */
    async handleServerError(error) {
        // Show server down notification
        this.showServerDownNotification();

        // Optionally retry critical operations
        if (this.isCriticalOperation(error)) {
            this.retryCriticalOperation(error);
        }
    }

    /**
     * Register an error handler
     */
    registerErrorHandler(handler) {
        this.errorHandlers.add(handler);
    }

    /**
     * Unregister an error handler
     */
    unregisterErrorHandler(handler) {
        this.errorHandlers.delete(handler);
    }

    // ============================================================================
    // LOADING STATE MANAGEMENT
    // ============================================================================

    /**
     * Show global loading state
     */
    showGlobalLoading(key, message = 'Loading...') {
        this.sharedLoadingStates.set(key, true);
        this.updateGlobalLoadingIndicator(message);
    }

    /**
     * Hide global loading state
     */
    hideGlobalLoading(key) {
        this.sharedLoadingStates.delete(key);
        this.updateGlobalLoadingIndicator();
    }

    /**
     * Update global loading indicator
     */
    updateGlobalLoadingIndicator(message = '') {
        const loadingElement = document.getElementById('global-loading-indicator');

        if (this.sharedLoadingStates.size > 0) {
            if (!loadingElement) {
                this.createGlobalLoadingIndicator(message);
            } else {
                const messageEl = loadingElement.querySelector('.loading-message');
                if (messageEl) messageEl.textContent = message;
                loadingElement.style.display = 'flex';
            }
        } else {
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    }

    /**
     * Create global loading indicator
     */
    createGlobalLoadingIndicator(message) {
        const overlay = document.createElement('div');
        overlay.id = 'global-loading-indicator';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;

        overlay.innerHTML = `
            <div style="text-align: center; color: var(--matrix-green);">
                <div class="loading-spinner" style="
                    border: 4px solid rgba(0, 255, 0, 0.3);
                    border-top: 4px solid var(--matrix-green);
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <div class="loading-message" style="
                    font-family: var(--font-mono);
                    font-size: 1.1rem;
                    letter-spacing: 1px;
                ">${message}</div>
            </div>
        `;

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);
    }

    // ============================================================================
    // REQUEST COORDINATION
    // ============================================================================

    /**
     * Queue requests for retry when network is restored
     */
    queueRequestsForRetry() {
        // Implementation would store pending requests for retry
        console.log('Queueing requests for retry when network is restored');
    }

    /**
     * Retry queued requests
     */
    retryQueuedRequests() {
        // Implementation would retry queued requests
        console.log('Retrying queued requests');
    }

    /**
     * Check if operation is critical
     */
    isCriticalOperation(error) {
        // Check if the failed request is for a critical operation
        // This would be based on URL patterns or request metadata
        return false; // Placeholder implementation
    }

    /**
     * Retry critical operation
     */
    retryCriticalOperation(error) {
        // Implementation would retry critical operations with backoff
        console.log('Retrying critical operation');
    }

    // ============================================================================
    // NOTIFICATIONS
    // ============================================================================

    /**
     * Show error notification
     */
    showErrorNotification(error) {
        const message = this.getUserFriendlyErrorMessage(error);
        this.showToast(message, 'error', 5000);
    }

    /**
     * Show offline notification
     */
    showOfflineNotification() {
        this.showToast('You are currently offline. Changes will be synced when connection is restored.', 'warning', 0);
    }

    /**
     * Show online notification
     */
    showOnlineNotification() {
        this.showToast('Connection restored! Syncing changes...', 'success', 3000);
    }

    /**
     * Show server down notification
     */
    showServerDownNotification() {
        this.showToast('Server temporarily unavailable. Please try again later.', 'error', 5000);
    }

    /**
     * Show login prompt
     */
    showLoginPrompt() {
        this.showToast('Please log in to continue', 'info', 3000);
        setTimeout(() => {
            // Navigate to login page
            window.location.href = '/academy/login.html';
        }, 3000);
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        this.showToast('Your session has expired. Please log in again.', 'warning', 3000);
        setTimeout(() => {
            window.location.href = '/academy/login.html';
        }, 3000);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create or use existing toast system
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, type, duration);
        } else {
            // Fallback simple alert
            alert(message);
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get user-friendly error message
     */
    getUserFriendlyErrorMessage(error) {
        if (typeof error === 'string') return error;

        if (error.message) {
            // Handle specific error messages
            if (error.message.includes('Failed to fetch')) {
                return 'Unable to connect to the server. Please check your internet connection.';
            }
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                return 'Your session has expired. Please log in again.';
            }
            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                return 'You do not have permission to perform this action.';
            }
            if (error.message.includes('500')) {
                return 'Server temporarily unavailable. Please try again later.';
            }
            return error.message;
        }

        return 'An unexpected error occurred. Please try again.';
    }

    /**
     * Get combined authentication status
     */
    isAuthenticated() {
        return (this.academyAPI?.isAuthenticated() || this.shopAPI?.isAuthenticated()) || false;
    }

    /**
     * Get current user token
     */
    getToken() {
        return this.academyAPI?.token || this.shopAPI?.token || null;
    }

    /**
     * Set token in both APIs
     */
    setToken(token) {
        if (this.academyAPI) this.academyAPI.setToken(token);
        if (this.shopAPI) this.shopAPI.setToken(token);
    }

    /**
     * Remove token from both APIs
     */
    removeToken() {
        if (this.academyAPI) this.academyAPI.removeToken();
        if (this.shopAPI) this.shopAPI.removeToken();
    }

    /**
     * Logout from both APIs
     */
    async logout() {
        this.removeToken();
        // Redirect to home page
        window.location.href = '/';
    }

    // ============================================================================
    // CROSS-API METHODS
    // ============================================================================

    /**
     * Get user dashboard combining academy and shop data
     */
    async getUnifiedDashboard() {
        try {
            const [academyData, shopData] = await Promise.allSettled([
                this.academyAPI?.getUserDashboard?.(),
                this.shopAPI?.getOrderHistory?.(1, 5)
            ]);

            return {
                academy: academyData.status === 'fulfilled' ? academyData.value : null,
                shop: shopData.status === 'fulfilled' ? shopData.value : null
            };
        } catch (error) {
            console.error('Failed to get unified dashboard:', error);
            return { academy: null, shop: null };
        }
    }

    /**
     * Get combined user statistics
     */
    async getCombinedStats() {
        const stats = {
            academy: {
                coursesEnrolled: 0,
                coursesCompleted: 0,
                totalHoursLearned: 0,
                certificatesEarned: 0
            },
            shop: {
                totalOrders: 0,
                totalSpent: 0,
                favoriteCategory: null
            },
            overall: {
                level: 1,
                points: 0,
                achievements: 0
            }
        };

        try {
            // Get academy stats
            if (this.academyAPI?.isAuthenticated()) {
                const enrolledCourses = await this.academyAPI.getUserEnrolledCourses();
                const userCertificates = await this.academyAPI.getUserCertificates();

                stats.academy.coursesEnrolled = enrolledCourses.length;
                stats.academy.coursesCompleted = enrolledCourses.filter(c => c.completion_percentage === 100).length;
                stats.academy.certificatesEarned = userCertificates.length;
                stats.academy.totalHoursLearned = enrolledCourses.reduce((total, course) =>
                    total + (course.time_spent_seconds || 0) / 3600, 0);
            }

            // Get shop stats
            if (this.shopAPI?.isAuthenticated()) {
                const orderHistory = await this.shopAPI.getOrderHistory(1, 100);

                stats.shop.totalOrders = orderHistory.totalCount;
                stats.shop.totalSpent = orderHistory.orders.reduce((total, order) =>
                    total + (order.total || 0), 0);
            }

            // Calculate overall level and points
            stats.overall.points =
                stats.academy.coursesCompleted * 100 +
                stats.academy.certificatesEarned * 200 +
                stats.shop.totalOrders * 50;

            stats.overall.level = Math.floor(stats.overall.points / 1000) + 1;
            stats.overall.achievements = Math.floor(stats.overall.points / 500);

        } catch (error) {
            console.error('Failed to get combined stats:', error);
        }

        return stats;
    }
}

// ============================================================================
// AUTO-INITIALIZE API MANAGER
// ============================================================================

// Initialize ApiManager when DOM and APIs are ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await ApiManager.init();
    } catch (error) {
        console.warn('Failed to initialize ApiManager:', error);
        // Continue without ApiManager - APIs will still work independently
    }
});

// Make ApiManager globally available
window.ApiManager = ApiManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiManager;
}
