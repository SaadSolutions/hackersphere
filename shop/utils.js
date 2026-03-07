/**
 * HACKERSPHERE SHOP UTILITIES
 * Shared utility functions for the shop
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Create URL-friendly slug from text
 * @param {string} text - Text to convert
 * @returns {string} URL-friendly slug
 */
function createSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Generate random ID
 * @param {number} length - Length of ID (default: 8)
 * @returns {string} Random ID
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return formatDate(dateObj);
}

/**
 * Calculate cart totals
 * @param {Array} items - Cart items with product and quantity
 * @returns {Object} Totals object
 */
function calculateCartTotals(items) {
    let subtotal = 0;
    let itemCount = 0;

    items.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        subtotal += itemTotal;
        itemCount += item.quantity;
    });

    const taxRate = 0.08; // 8%
    const shippingThreshold = 50;
    const shippingRate = 9.99;

    const tax = subtotal * taxRate;
    const shipping = subtotal >= shippingThreshold ? 0 : shippingRate;
    const total = subtotal + tax + shipping;

    return {
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        total: total,
        itemCount: itemCount,
        freeShippingRemaining: Math.max(0, shippingThreshold - subtotal)
    };
}

/**
 * Validate form data
 * @param {Object} data - Form data object
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
function validateForm(data, rules) {
    const errors = {};

    Object.keys(rules).forEach(field => {
        const value = data[field];
        const fieldRules = rules[field];
        const fieldErrors = [];

        // Required validation
        if (fieldRules.required && (!value || value.toString().trim() === '')) {
            fieldErrors.push(`${fieldRules.label || field} is required`);
        }

        // Email validation
        if (fieldRules.email && value && !isValidEmail(value)) {
            fieldErrors.push('Please enter a valid email address');
        }

        // Min length validation
        if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
            fieldErrors.push(`${fieldRules.label || field} must be at least ${fieldRules.minLength} characters`);
        }

        // Max length validation
        if (fieldRules.maxLength && value && value.length > fieldRules.maxLength) {
            fieldErrors.push(`${fieldRules.label || field} must be no more than ${fieldRules.maxLength} characters`);
        }

        // Pattern validation
        if (fieldRules.pattern && value && !fieldRules.pattern.test(value)) {
            fieldErrors.push(fieldRules.message || `${fieldRules.label || field} format is invalid`);
        }

        // Custom validation function
        if (fieldRules.custom && typeof fieldRules.custom === 'function') {
            const customResult = fieldRules.custom(value, data);
            if (customResult !== true) {
                fieldErrors.push(customResult);
            }
        }

        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors: errors
    };
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackErr) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Lazy load images
 * @param {NodeList} images - Images to lazy load
 */
function lazyLoadImages(images) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        if (img.dataset.src) {
            imageObserver.observe(img);
        }
    });
}

/**
 * Get URL parameters
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value or null
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Set URL parameters without page reload
 * @param {Object} params - Parameters to set
 */
function setUrlParameters(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.pushState({}, '', url);
}

/**
 * Animate number counting up
 * @param {HTMLElement} element - Element to animate
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Duration in milliseconds
 */
function animateNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const difference = end - start;

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);

        const current = Math.floor(start + difference * easeOutProgress);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }

    requestAnimationFrame(updateNumber);
}

/**
 * Create loading spinner element
 * @param {string} size - Spinner size (small, medium, large)
 * @returns {HTMLElement} Spinner element
 */
function createSpinner(size = 'medium') {
    const spinner = document.createElement('div');
    spinner.className = `loading-spinner loading-spinner-${size}`;

    const sizes = {
        small: { width: '20px', height: '20px', border: '2px' },
        medium: { width: '40px', height: '40px', border: '4px' },
        large: { width: '60px', height: '60px', border: '5px' }
    };

    const sizeStyle = sizes[size] || sizes.medium;

    spinner.style.cssText = `
        width: ${sizeStyle.width};
        height: ${sizeStyle.height};
        border: ${sizeStyle.border} solid var(--glass-border);
        border-top: ${sizeStyle.border} solid var(--matrix-green);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    `;

    return spinner;
}

/**
 * Show loading overlay on element
 * @param {HTMLElement} element - Element to show loading on
 * @param {string} message - Loading message
 */
function showLoading(element, message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10;
        color: var(--text-primary);
        font-size: 1.1rem;
        font-weight: bold;
    `;

    overlay.innerHTML = `
        ${createSpinner('medium').outerHTML}
        <span style="margin-top: 15px;">${message}</span>
    `;

    element.style.position = 'relative';
    element.appendChild(overlay);
}

/**
 * Hide loading overlay from element
 * @param {HTMLElement} element - Element to hide loading from
 */
function hideLoading(element) {
    const overlay = element.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Create product card element
 * @param {Object} product - Product data
 * @param {boolean} compact - Whether to use compact layout
 * @returns {HTMLElement} Product card element
 */
function createProductCard(product, compact = false) {
    const card = document.createElement('div');
    card.className = `product-card ${compact ? 'compact' : ''}`;
    card.dataset.productId = product.id;

    const imageUrl = product.image || '/shop/images/placeholder.jpg';

    card.innerHTML = `
        ${!compact ? `<div class="product-category">${product.category}</div>` : ''}
        <div class="product-name">${product.name}</div>
        ${!compact ? `<div class="product-description">${product.description}</div>` : ''}
        <div class="product-price">${formatCurrency(product.price)}</div>
        <div class="product-rating">
            ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
            <span class="rating-text">${product.rating} (${product.review_count})</span>
        </div>
        <div class="product-buttons">
            <button class="product-button primary" onclick="storeManager.addToCart('${product.id}')">
                Add to Cart
            </button>
            <button class="product-button secondary" onclick="storeManager.showProductModal('${product.id}')">
                ${compact ? 'View' : 'Details'}
            </button>
        </div>
    `;

    return card;
}

/**
 * Get cart item count from localStorage
 * @returns {number} Number of items in cart
 */
function getCartItemCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('shop_cart') || '[]');
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    } catch (error) {
        console.error('Error getting cart count:', error);
        return 0;
    }
}

/**
 * Update page title with dynamic content
 * @param {string} title - Page title
 */
function setPageTitle(title) {
    document.title = `${title} - HackerSphere Shop`;
}

/**
 * Handle keyboard navigation
 * @param {Event} e - Keyboard event
 * @param {Object} handlers - Key handlers object
 */
function handleKeyboardNavigation(e, handlers) {
    const handler = handlers[e.key];
    if (handler) {
        e.preventDefault();
        handler(e);
    }
}

// ============================================================================
// GLOBAL UTILITY FUNCTIONS (for easy access)
// ============================================================================

window.HackerUtils = {
    formatCurrency,
    debounce,
    createSlug,
    isValidEmail,
    generateId,
    formatDate,
    formatRelativeTime,
    calculateCartTotals,
    validateForm,
    copyToClipboard,
    lazyLoadImages,
    getUrlParameter,
    setUrlParameters,
    animateNumber,
    createSpinner,
    showLoading,
    hideLoading,
    createProductCard,
    getCartItemCount,
    setPageTitle,
    handleKeyboardNavigation
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        debounce,
        createSlug,
        isValidEmail,
        generateId,
        formatDate,
        formatRelativeTime,
        calculateCartTotals,
        validateForm,
        copyToClipboard,
        lazyLoadImages,
        getUrlParameter,
        setUrlParameters,
        animateNumber,
        createSpinner,
        showLoading,
        hideLoading,
        createProductCard,
        getCartItemCount,
        setPageTitle,
        handleKeyboardNavigation
    };
}
