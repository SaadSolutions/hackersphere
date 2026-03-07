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
            normalized.type = this }
