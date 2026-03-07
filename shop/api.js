/**
 * HACKERSPHERE SHOP API WRAPPER
 * API client for real backend integration
 */
class ShopAPI {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.token = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // Base delay in ms
    this.loadingStates = new Map();
    this.cartSyncEnabled = true;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}/shop${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add auth token if available
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  setToken(token) {
    this.token = token;
    localStorage.setItem('shop_token', token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('shop_token');
  }

  loadToken() {
    const storedToken = localStorage.getItem('shop_token');
    if (storedToken) {
      this.token = storedToken;
    }
    return this.token;
  }

  isAuthenticated() {
    return !!this.token || !!localStorage.getItem('shop_token');
  }

  // ============================================================================
  // PRODUCT METHODS
  // ============================================================================

  async getProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      // Add search parameter
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const endpoint = `/products?${queryParams.toString()}`;
      const response = await this.makeRequest(endpoint);

      return {
        products: response.data || response.products || [],
        totalCount: response.totalCount || response.count || 0
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProduct(productIdOrSlug) {
    try {
      // Try by slug first, then by ID
      let response;
      try {
        response = await this.makeRequest(`/products/slug/${productIdOrSlug}`);
      } catch (slugError) {
        // If slug fails, try by ID
        response = await this.makeRequest(`/products/${productIdOrSlug}`);
      }
      return response;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async getCategories() {
    try {
      // Backend doesn't seem to have a categories endpoint,
      // so we'll return a basic set or extract from products
      const productsResponse = await this.getProducts();
      const categories = [...new Set(productsResponse.products.map(p => p.category))].filter(Boolean);

      return { categories: categories.map(cat => ({ name: cat, slug: cat.toLowerCase().replace(/\s+/g, '-') })) };
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return basic fallback categories
      return {
        categories: [
          { name: 'Hacking Tools', slug: 'hacking-tools' },
          { name: 'Security Gear', slug: 'security-gear' },
          { name: 'Software', slug: 'software' },
          { name: 'Courses', slug: 'courses' },
          { name: 'Books', slug: 'books' }
        ]
      };
    }
  }

  // ============================================================================
  // CART METHODS
  // ============================================================================

  async getCartItems() {
    try {
      const response = await this.makeRequest('/cart');
      return { items: response.data || [] };
    } catch (error) {
      console.error('Error fetching cart items:', error);
      // Return empty cart if user is not authenticated
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return { items: [] };
      }
      throw error;
    }
  }

  async addToCart(productId, quantity = 1) {
    try {
      const response = await this.makeRequest('/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity })
      });
      return response;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  }

  async updateCartItem(itemId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(itemId);
      }

      const response = await this.makeRequest(`/cart/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
      return response;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  async removeFromCart(itemId) {
    try {
      const response = await this.makeRequest(`/cart/${itemId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw error;
    }
  }

  async clearCart() {
    try {
      // Get current cart items and remove them all
      const cartData = await this.getCartItems();
      for (const item of cartData.items) {
        await this.removeFromCart(item.id || item.product_id);
      }
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // ============================================================================
  // ORDER METHODS
  // ============================================================================

  async createOrder(orderData) {
    try {
      const response = await this.makeRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      return response;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrders() {
    try {
      const response = await this.makeRequest('/orders');
      return { orders: response.data || [] };
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return { orders: [] };
      }
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const response = await this.makeRequest(`/orders/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // ============================================================================
  // ADVANCED PRODUCT METHODS
  // ============================================================================

  async getProductVariants(productId) {
    try {
      const response = await this.makeRequest(`/products/${productId}/variants`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching product variants:', error);
      throw error;
    }
  }

  async getProductReviews(productId, page = 1, limit = 10) {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      const response = await this.makeRequest(`/products/${productId}/reviews?${queryParams.toString()}`);
      return {
        reviews: response.data || [],
        totalCount: response.totalCount || 0,
        averageRating: response.averageRating || 0
      };
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  // ============================================================================
  // DISCOUNT AND PROMOTION METHODS
  // ============================================================================

  async applyDiscountCode(code, cartItems) {
    try {
      const response = await this.makeRequest('/discounts/apply', {
        method: 'POST',
        body: JSON.stringify({
          code: code,
          cartItems: cartItems
        })
      });
      return {
        discount: response.discount || 0,
        type: response.type || 'fixed', // 'fixed' or 'percentage'
        description: response.description || '',
        valid: response.valid !== false
      };
    } catch (error) {
      console.error('Error applying discount code:', error);
      // Return invalid discount if there's an error
      return {
        discount: 0,
        type: 'fixed',
        description: 'Invalid discount code',
        valid: false
      };
    }
  }

  // ============================================================================
  // SHIPPING METHODS
  // ============================================================================

  async calculateShipping(cartItems, address) {
    try {
      const response = await this.makeRequest('/shipping/calculate', {
        method: 'POST',
        body: JSON.stringify({
          cartItems: cartItems,
          address: address
        })
      });
      return {
        shippingCost: response.shippingCost || 0,
        estimatedDays: response.estimatedDays || 3,
        method: response.method || 'standard'
      };
    } catch (error) {
      console.error('Error calculating shipping:', error);
      // Return default shipping if calculation fails
      return {
        shippingCost: 9.99,
        estimatedDays: 5,
        method: 'standard'
      };
    }
  }

  async getShippingMethods() {
    try {
      const response = await this.makeRequest('/shipping/methods');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
      // Return default shipping methods
      return [
        { id: 'standard', name: 'Standard Shipping', cost: 9.99, estimatedDays: 5 },
        { id: 'express', name: 'Express Shipping', cost: 19.99, estimatedDays: 2 },
        { id: 'overnight', name: 'Overnight Shipping', cost: 39.99, estimatedDays: 1 }
      ];
    }
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  async getPaymentIntent(orderData) {
    try {
      const response = await this.makeRequest('/payment/intent', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      return {
        clientSecret: response.clientSecret,
        amount: response.amount,
        currency: response.currency || 'usd'
      };
    } catch (error) {
      console.error('Error getting payment intent:', error);
      throw error;
    }
  }

  async getSavedCards() {
    try {
      const response = await this.makeRequest('/payment/cards');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching saved cards:', error);
      return [];
    }
  }

  // ============================================================================
  // ORDER TRACKING METHODS
  // ============================================================================

  async trackOrder(orderId) {
    try {
      const response = await this.makeRequest(`/orders/${orderId}/track`);
      return {
        orderId: orderId,
        status: response.status || 'pending',
        trackingNumber: response.trackingNumber,
        carrier: response.carrier,
        estimatedDelivery: response.estimatedDelivery,
        trackingHistory: response.trackingHistory || []
      };
    } catch (error) {
      console.error('Error tracking order:', error);
      throw error;
    }
  }

  async getOrderHistory(page = 1, limit = 10) {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      const response = await this.makeRequest(`/orders/history?${queryParams.toString()}`);
      return {
        orders: response.data || [],
        totalCount: response.totalCount || 0,
        page: response.page || page,
        totalPages: response.totalPages || Math.ceil((response.totalCount || 0) / limit)
      };
    } catch (error) {
      console.error('Error fetching order history:', error);
      return {
        orders: [],
        totalCount: 0,
        page: page,
        totalPages: 0
      };
    }
  }

  // ============================================================================
  // INVENTORY METHODS
  // ============================================================================

  async checkInventory(productId, quantity = 1) {
    try {
      const response = await this.makeRequest(`/inventory/check/${productId}?quantity=${quantity}`);
      return {
        available: response.available !== false,
        inStock: response.inStock || 0,
        backordered: response.backordered || false
      };
    } catch (error) {
      console.error('Error checking inventory:', error);
      return {
        available: false,
        inStock: 0,
        backordered: false
      };
    }
  }

  // ============================================================================
  // ERROR HANDLING METHODS
  // ============================================================================

  async handleNetworkError(error) {
    console.error('Network error:', error);

    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Unable to connect to the server. Please try again later.');
    }

    return error;
  }

  async handleAuthError(error) {
    console.error('Authentication error:', error);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      this.removeToken();
      this.redirectToAuth();
      throw new Error('Your session has expired. Please log in again.');
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('You do not have permission to perform this action.');
    }

    return error;
  }

  async handleServerError(error) {
    console.error('Server error:', error);

    if (error.message.includes('500')) {
      throw new Error('Server temporarily unavailable. Please try again later.');
    }

    if (error.message.includes('503')) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    return error;
  }

  async retryWithBackoff(requestFn, maxRetries = this.retryAttempts, baseDelay = this.retryDelay) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        const isRetryable =
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('500') ||
          error.message.includes('503') ||
          error.message.includes('502') ||
          error.message.includes('504');

        if (!isRetryable || attempt === maxRetries - 1) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ============================================================================
  // LOADING STATE MANAGEMENT
  // ============================================================================

  showLoadingIndicator(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
      element.style.display = 'block';
    }
    this.loadingStates.set(elementId, true);
  }

  hideLoadingIndicator(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
      element.innerHTML = '';
    }
    this.loadingStates.delete(elementId);
  }

  updateProgressBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (element) {
      const progressBar = element.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
      }

      const progressText = element.querySelector('.progress-text');
      if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
      }
    }
  }

  // ============================================================================
  // CART PERSISTENCE AND SYNC
  // ============================================================================

  syncCartLocally(cartData) {
    if (this.cartSyncEnabled) {
      localStorage.setItem('shop_cart_backup', JSON.stringify({
        items: cartData.items,
        timestamp: Date.now()
      }));
    }
  }

  getLocalCart() {
    try {
      const cartBackup = localStorage.getItem('shop_cart_backup');
      if (cartBackup) {
        const parsed = JSON.parse(cartBackup);
        // Only use backup if it's less than 24 hours old
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.items;
        }
      }
    } catch (error) {
      console.error('Error loading local cart:', error);
    }
    return [];
  }

  redirectToAuth() {
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('post_login_redirect', currentPath);
    window.location.href = '/shop/login.html';
  }

  //

  // UTILITY METHODS FOR INTEGRATION WITH SHOP
  //

  async processPayment(orderData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock payment processing - in real app, integrate with Stripe, PayPal, etc.
        const success = Math.random() > 0.1; // 90% success rate for demo

        if (success) {
          resolve({
            success: true,
            transaction_id: 'txn_' + Date.now(),
            message: 'Payment processed successfully'
          });
        } else {
          reject(new Error('Payment processing failed'));
        }
      }, 1000); // Simulate processing delay
    });
  }
}

// ============================================================================
// SHOP API INSTANCE
// ============================================================================

const shopAPI = new ShopAPI();

// Make globally available
window.ShopAPI = shopAPI;

// Auto-load token on page load
document.addEventListener('DOMContentLoaded', () => {
  shopAPI.loadToken();
});


