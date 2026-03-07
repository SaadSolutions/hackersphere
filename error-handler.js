/**
 * HACKERSPHERE ERROR HANDLER
 * Global error handling and user notification system
 */

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.toastContainer = null;
        this.modalContainer = null;
        this.errorHandlers = new Map();
        this.recoveryStrategies = new Map();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize the error handler
     */
    static async init() {
        if (window.errorHandler) return window.errorHandler;

        const instance = new ErrorHandler();
        window.errorHandler = instance;

        instance.createToastContainer();
        instance.createModalContainer();
        instance.setupGlobalErrorHandling();
        instance.registerDefaultErrorHandlers();

        console.log('ErrorHandler initialized successfully');
        return instance;
    }

    /**
     * Create toast notification container
     */
    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container';
        this.toastContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
        `;

        document.body.appendChild(this.toastContainer);
    }

    /**
     * Create modal container for error dialogs
     */
    createModalContainer() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'error-modal-overlay';
        this.modalContainer.className = 'error-modal-overlay';
        this.modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(5px);
        `;

        this.modalContainer.innerHTML = `
            <div class="error-modal" style="
                background: var(--hacker-grey, #1a1a1a);
                border: 2px solid var(--matrix-green, #00ff00);
                border-radius: 8px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
            ">
                <div class="error-icon" style="
                    font-size: 4rem;
                    color: var(--error-red, #ff4444);
                    margin-bottom: 20px;
                ">⚠️</div>
                <h2 class="error-title" style="
                    color: var(--matrix-green, #00ff00);
                    margin-bottom: 15px;
                    font-size: 1.5rem;
                ">Error</h2>
                <p class="error-message" style="
                    color: var(--text-secondary, #cccccc);
                    margin-bottom: 25px;
                    line-height: 1.5;
                ">An error occurred</p>
                <div class="error-actions" style="
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                ">
                    <button class="error-retry-btn" style="
                        background: var(--matrix-green, #00ff00);
                        color: black;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                        font-family: var(--font-mono, monospace);
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">Retry</button>
                    <button class="error-dismiss-btn" style="
                        background: transparent;
                        color: var(--text-secondary, #cccccc);
                        border: 1px solid var(--text-dim, #666);
                        padding: 12px 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: var(--font-mono, monospace);
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">Dismiss</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalContainer);

        // Bind modal events
        const retryBtn = this.modalContainer.querySelector('.error-retry-btn');
        const dismissBtn = this.modalContainer.querySelector('.error-dismiss-btn');

        retryBtn.addEventListener('click', () => this.handleRetry());
        dismissBtn.addEventListener('click', () => this.hideErrorModal());
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            this.handleError(event.reason, 'unhandledrejection');
        });

        // Handle unhandled errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message, 'unhandlederror');
        });

        // Handle API errors through ApiManager if available
        if (window.ApiManager) {
            window.ApiManager.registerErrorHandler((error) => {
                this.handleError(error, 'api');
            });
        }
    }

    /**
     * Register default error handlers
     */
    registerDefaultErrorHandlers() {
        // Network errors
        this.registerHandler('network', (error) => ({
            message: 'Connection lost. Please check your internet and try again.',
            type: 'warning',
            showRetry: true,
            recoveryAction: () => window.location.reload()
        }));

        // Authentication errors
        this.registerHandler('auth', (error) => ({
            message: 'Your session has expired. Please log in again.',
            type: 'error',
            showRetry: false,
            recoveryAction: () => window.location.href = '/academy/login.html'
        }));

        // Server errors
        this.registerHandler('server', (error) => ({
            message: 'Server temporarily unavailable. Please try again later.',
            type: 'error',
            showRetry: true,
            retryDelay: 5000
        }));

        // Validation errors
        this.registerHandler('validation', (error) => ({
            message: error.message || 'Please check your input and try again.',
            type: 'warning',
            showRetry: false
        }));

        // Permission errors
        this.registerHandler('permission', (error) => ({
            message: 'You do not have permission to perform this action.',
            type: 'error',
            showRetry: false
        }));
    }

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    /**
     * Handle an error
     * @param {Error|Object|string} error - The error to handle
     * @param {string} source - Source of the error
     */
    async handleError(error, source = 'unknown') {
        // Normalize error object
        const normalizedError = this.normalizeError(error, source);

        // Add to error history
        this.addToHistory(normalizedError);

        // Determine error type and get handling strategy
        const strategy = this.getErrorStrategy(normalizedError);

        // Apply recovery strategy if available
        if (strategy.recoveryAction && this.shouldAutoRecover(normalizedError)) {
            await this.attemptRecovery(strategy, normalizedError);
            return;
        }

        // Show user notification
        this.showErrorNotification(strategy, normalizedError);
    }

    /**
     * Normalize error object to consistent format
     */
    normalizeError(error, source) {
        const normalized = {
            timestamp: new Date(),
            source: source,
            originalError: error
        };

        if (typeof error === 'string') {
            normalized.type = 'unknown';
            normalized.message = error;
            normalized.code = null;
        } else if (error instanceof Error) {
            normalized.type = this.classifyError(error);
            normalized.message = error.message;
            normalized.code = error.code || null;
            normalized.stack = error.stack;
        } else if (typeof error === 'object') {
            normalized.type = error.type || this.classifyError(error);
            normalized.message = error.message || 'An unknown error occurred';
            normalized.code = error.status || error.code || null;
        } else {
            normalized.type = 'unknown';
            normalized.message = String(error);
            normalized.code = null;
        }

        return normalized;
    }

    /**
     * Classify error type based on error properties
     * @param {Error|Object} error - Error to classify
     * @returns {string} Error type
     */
    classifyError(error) {
        const message = (error.message || '').toLowerCase();
        const status = error.status || error.code;

        if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
            return 'auth';
        }
        if (status >= 500 || message.includes('server error') || message.includes('internal server')) {
            return 'server';
        }
        if (message.includes('network') || message.includes('failed to fetch') || message.includes('timeout')) {
            return 'network';
        }
        if (status === 400 || status === 422 || message.includes('validation') || message.includes('invalid')) {
            return 'validation';
        }
        if (message.includes('permission') || message.includes('access denied')) {
            return 'permission';
        }
        return 'unknown';
    }

    // ============================================================================
    // ERROR STRATEGY & RECOVERY
    // ============================================================================

    /**
     * Get error handling strategy based on error type
     * @param {Object} normalizedError - Normalized error object
     * @returns {Object} Error handling strategy
     */
    getErrorStrategy(normalizedError) {
        const handler = this.errorHandlers.get(normalizedError.type);

        if (handler) {
            return handler(normalizedError);
        }

        // Default strategy
        return {
            message: normalizedError.message || 'An unexpected error occurred.',
            type: 'error',
            showRetry: false
        };
    }

    /**
     * Determine if error should auto-recover
     * @param {Object} normalizedError - Normalized error object
     * @returns {boolean} Whether to attempt auto-recovery
     */
    shouldAutoRecover(normalizedError) {
        // Auto-recover network errors and auth errors
        return normalizedError.type === 'network' || normalizedError.type === 'auth';
    }

    /**
     * Attempt error recovery
     * @param {Object} strategy - Error handling strategy
     * @param {Object} normalizedError - Normalized error object
     */
    async attemptRecovery(strategy, normalizedError) {
        try {
            if (strategy.retryDelay) {
                await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
            }
            strategy.recoveryAction();
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            this.showErrorNotification(strategy, normalizedError);
        }
    }

    /**
     * Register an error handler for a specific type
     * @param {string} type - Error type
     * @param {Function} handler - Handler function
     */
    registerHandler(type, handler) {
        this.errorHandlers.set(type, handler);
    }

    // ============================================================================
    // NOTIFICATIONS
    // ============================================================================

    /**
     * Show error notification to user
     * @param {Object} strategy - Error handling strategy
     * @param {Object} normalizedError - Normalized error object
     */
    showErrorNotification(strategy, normalizedError) {
        if (strategy.showRetry) {
            this.showErrorModal(strategy.message, strategy.recoveryAction);
        } else {
            this.showToast(strategy.message, strategy.type || 'error');
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (info, warning, error, success)
     * @param {number} duration - Duration in ms
     */
    showToast(message, type = 'info', duration = 5000) {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            pointer-events: auto;
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
            animation: slideIn 0.3s ease;
            border-left: 4px solid;
            background: rgba(26, 26, 26, 0.95);
            color: #cccccc;
        `;

        const colors = {
            info: '#00ff00',
            success: '#00ff00',
            warning: '#ffaa00',
            error: '#ff4444'
        };

        toast.style.borderLeftColor = colors[type] || colors.info;
        toast.textContent = message;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Show error modal dialog
     * @param {string} message - Error message
     * @param {Function} retryAction - Retry action callback
     */
    showErrorModal(message, retryAction) {
        if (!this.modalContainer) return;

        const messageEl = this.modalContainer.querySelector('.error-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        this.currentRetryAction = retryAction;
        this.modalContainer.style.display = 'flex';
    }

    /**
     * Hide error modal
     */
    hideErrorModal() {
        if (this.modalContainer) {
            this.modalContainer.style.display = 'none';
        }
        this.currentRetryAction = null;
    }

    /**
     * Handle retry button click
     */
    handleRetry() {
        this.hideErrorModal();
        if (this.currentRetryAction) {
            this.currentRetryAction();
        }
    }

    // ============================================================================
    // ERROR HISTORY
    // ============================================================================

    /**
     * Add error to history
     * @param {Object} normalizedError - Normalized error object
     */
    addToHistory(normalizedError) {
        this.errorHistory.push(normalizedError);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * Get error history
     * @returns {Array} Error history
     */
    getHistory() {
        return [...this.errorHistory];
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
    }
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    ErrorHandler.init();
});

// Make available globally
window.ErrorHandler = ErrorHandler;
