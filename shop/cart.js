/**
 * HACKERSPHERE SHOP CART MANAGEMENT
 * Cart display and management functionality
 */

class CartManager {
    constructor() {
        this.cartItems = [];
        this.totals = {};
        this.init();
    }

    async init() {
        try {
            await this.loadCart();
            this.setupEventListeners();
            this.updateCartDisplay();
            this.updateCartCount();
            this.loadRecommendations();
        } catch (error) {
            console.error('Failed to initialize cart:', error);
            this.showError('Failed to load cart data. Please refresh the page.');
        }
    }

    async loadCart() {
        try {
            const response = await ShopAPI.getCartItems();
            this.cartItems = response.items;
            this.calculateTotals();
        } catch (error) {
            console.error('Failed to load cart items:', error);
        }
    }

    calculateTotals() {
        this.totals = HackerUtils.calculateCartTotals(this.cartItems);
    }

    setupEventListeners() {
        // Quantity updates
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                const itemId = e.target.closest('.cart-item-full').dataset.productId;
                const isIncrease = e.target.textContent === '+';
                this.updateItemQuantity(itemId, isIncrease);
            }
        });

        // Remove items
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-full')) {
                const itemId = e.target.closest('.cart-item-full').dataset.productId;
                this.removeItem(itemId);
            }
        });

        // Checkout buttons
        const checkoutBtn = document.getElementById('checkout-button');
        const sidebarCheckoutBtn = document.getElementById('sidebar-checkout-button');

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }

        if (sidebarCheckoutBtn) {
            sidebarCheckoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }

        // Promo code
        const promoApplyBtn = document.getElementById('promo-apply');
        const promoCodeInput = document.getElementById('promo-code');

        if (promoApplyBtn) {
            promoApplyBtn.addEventListener('click', () => this.applyPromoCode());
        }

        if (promoCodeInput) {
            promoCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyPromoCode();
                }
            });
        }

        // Cart sidebar (for header cart button)
        const cartBtn = document.getElementById('cart-button');
        const closeCart = document.getElementById('close-cart');
        const overlay = document.getElementById('overlay');

        if (cartBtn) {
            cartBtn.addEventListener('click', () => this.toggleCartSidebar());
        }

        if (closeCart) {
            closeCart.addEventListener('click', () => this.closeCartSidebar());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeCartSidebar());
        }
    }

    updateCartDisplay() {
        this.renderCartItems();
        this.updateCartSummary();
        this.updateShippingNotice();
    }

    renderCartItems() {
        const cartContainer = document.getElementById('cart-items-container');
        const sidebarContainer = document.getElementById('sidebar-cart-items');

        if (this.cartItems.length === 0) {
            this.showEmptyCart(cartContainer, sidebarContainer);
            return;
        }

        // Full cart items
        this.renderFullCartItems(cartContainer);

        // Sidebar cart items
        this.renderSidebarCartItems(sidebarContainer);
    }

    showEmptyCart(container, sidebarContainer) {
        const emptyCartHTML = `
            <div class="empty-cart-full">
                <div class="empty-cart-content">
                    <span class="empty-cart-icon-large">🛒</span>
                    <h2>Your cart is empty</h2>
                    <p>Discover our collection of elite cyber tools and gear</p>
                    <a href="index.html" class="cta-button primary">Explore Products</a>
                </div>
            </div>
        `;

        container.innerHTML = emptyCartHTML;

        const sidebarEmptyHTML = `
            <div class="empty-cart">
                <span class="empty-cart-icon">🛒</span>
                <p>Your cart is empty</p>
                <p class="empty-cart-subtext">Add some elite gear to get started</p>
            </div>
        `;

        sidebarContainer.innerHTML = sidebarEmptyHTML;

        // Hide summary sections
        this.toggleSummaryDisplay(false);
    }

    renderFullCartItems(container) {
        container.innerHTML = '';

        this.cartItems.forEach(item => {
            const itemTotal = item.product.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item-full';
            itemElement.dataset.productId = item.product_id;

            itemElement.innerHTML = `
                <div class="cart-item-main">
                    <div class="cart-item-image">
                        <img src="${item.product.image || '/shop/images/placeholder.jpg'}"
                             alt="${item.product.name}"
                             loading="lazy">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-category">${item.product.category}</div>
                        <h3 class="cart-item-title">${item.product.name}</h3>
                        <p class="cart-item-description">${item.product.description}</p>
                        <div class="cart-item-specs">
                            <div class="spec-item">
                                <strong>Price:</strong> $${item.product.price.toFixed(2)}
                            </div>
                            <div class="spec-item">
                                <strong>Rating:</strong> ${'★'.repeat(Math.floor(item.product.rating))}${'☆'.repeat(5 - Math.floor(item.product.rating))} (${item.product.review_count} reviews)
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-quantity-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="cartManager.updateItemQuantity('${item.product_id}', false)">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="cartManager.updateItemQuantity('${item.product_id}', true)">+</button>
                        </div>
                        <button class="remove-item-full" onclick="cartManager.removeItem('${item.product_id}')">
                            <span class="remove-icon">🗑️</span>
                            Remove
                        </button>
                    </div>
                    <div class="cart-item-total">
                        <div class="item-price">$${item.product.price.toFixed(2)} each</div>
                        <div class="item-total-price">$${itemTotal.toFixed(2)}</div>
                    </div>
                </div>
            `;

            container.appendChild(itemElement);
        });

        this.toggleSummaryDisplay(true);
    }

    renderSidebarCartItems(container) {
        container.innerHTML = '';

        this.cartItems.slice(0, 5).forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';

            cartItem.innerHTML = `
                <img src="${item.product.image || '/shop/images/placeholder.jpg'}" alt="${item.product.name}" loading="lazy">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.product.name}</div>
                    <div class="cart-item-price">$${item.product.price.toFixed(2)} × ${item.quantity}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-quantity">
                        <button class="quantity-btn" onclick="cartManager.updateSidebarItemQuantity('${item.product_id}', false)">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="cartManager.updateSidebarItemQuantity('${item.product_id}', true)">+</button>
                    </div>
                    <button class="remove-item" onclick="cartManager.removeItem('${item.product_id}')">&times;</button>
                </div>
            `;

            container.appendChild(cartItem);
        });

        // Show "view full cart" if there are more items
        if (this.cartItems.length > 5) {
            const viewMoreItem = document.createElement('div');
            viewMoreItem.className = 'cart-view-more';
            viewMoreItem.innerHTML = `
                <a href="#" class="view-full-cart">View full cart (+${this.cartItems.length - 5} more items)</a>
            `;
            container.appendChild(viewMoreItem);
        }
    }

    toggleSummaryDisplay(show) {
        const summarySections = document.querySelectorAll('.cart-summary-section');
        summarySections.forEach(section => {
            section.style.display = show ? 'block' : 'none';
        });
    }

    updateCartSummary() {
        const subtotalEl = document.getElementById('summary-subtotal');
        const taxEl = document.getElementById('summary-tax');
        const shippingEl = document.getElementById('summary-shipping');
        const totalEl = document.getElementById('summary-total');
        const sidebarTotalEl = document.getElementById('sidebar-cart-total');

        if (subtotalEl) subtotalEl.textContent = `$${this.totals.subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${this.totals.tax.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = `$${this.totals.shipping === 0 ? 'FREE' : '$' + this.totals.shipping.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${this.totals.total.toFixed(2)}`;
        if (sidebarTotalEl) sidebarTotalEl.textContent = `$${this.totals.total.toFixed(2)}`;

        // Update sidebar footer visibility
        const sidebarFooter = document.getElementById('sidebar-cart-footer');
        if (sidebarFooter) {
            sidebarFooter.style.display = this.cartItems.length > 0 ? 'block' : 'none';
        }
    }

    updateShippingNotice() {
        const noticeEl = document.getElementById('shipping-notice');
        const amountEl = document.getElementById('free-shipping-amount');

        if (noticeEl && amountEl) {
            if (this.totals.freeShippingRemaining > 0) {
                noticeEl.style.display = 'flex';
                amountEl.textContent = this.totals.freeShippingRemaining.toFixed(2);
            } else {
                noticeEl.style.display = 'none';
            }
        }
    }

    async updateItemQuantity(productId, increase) {
        const currentItem = this.cartItems.find(item => item.product_id === productId);
        if (!currentItem) return;

        const newQuantity = increase ? currentItem.quantity + 1 : Math.max(1, currentItem.quantity - 1);

        try {
            await ShopAPI.updateCartItem(productId, newQuantity);
            await this.loadCart();
            this.updateCartDisplay();
            this.updateCartCount();
        } catch (error) {
            console.error('Failed to update item quantity:', error);
            this.showError('Failed to update item quantity.');
        }
    }

    async updateSidebarItemQuantity(productId, increase) {
        await this.updateItemQuantity(productId, increase);
    }

    async removeItem(productId) {
        try {
            await ShopAPI.removeFromCart(productId);
            await this.loadCart();
            this.updateCartDisplay();
            this.updateCartCount();
            this.showSuccess('Item removed from cart');
        } catch (error) {
            console.error('Failed to remove item:', error);
            this.showError('Failed to remove item from cart.');
        }
    }

    proceedToCheckout() {
        if (this.cartItems.length === 0) {
            this.showError('Your cart is empty. Add some items before proceeding to checkout.');
            return;
        }

        // In a real app, this would redirect to checkout
        window.location.href = 'checkout.html';
    }

    applyPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const promoCode = promoInput?.value.trim().toUpperCase();

        if (!promoCode) {
            this.showError('Please enter a promo code.');
            return;
        }

        // Mock promo code validation
        if (promoCode === 'HACKER25') {
            // Apply 25% discount
            this.totals.discount = this.totals.subtotal * 0.25;
            this.totals.total = this.totals.total - this.totals.discount;
            this.updateCartSummary();
            this.showSuccess('Promo code applied! 25% discount added.');
            promoInput.value = '';
        } else if (promoCode === 'FREESHIP') {
            // Free shipping
            this.totals.shipping = 0;
            this.totals.total = this.totals.subtotal + this.totals.tax;
            this.updateCartSummary();
            this.updateShippingNotice();
            this.showSuccess('Free shipping applied!');
            promoInput.value = '';
        } else {
            this.showError('Invalid promo code. Please try again.');
        }
    }

    async loadRecommendations() {
        try {
            // Simple recommendation logic - show random products from same categories
            const categories = [...new Set(this.cartItems.map(item => item.product.category))];
            let recommendations = [];

            categories.forEach(category => {
                const categoryProducts = ProductDataStore.products.filter(p =>
                    p.category === category && !this.isInCart(p.id)
                );
                recommendations = recommendations.concat(categoryProducts.slice(0, 2));
            });

            // If not enough recommendations, add random featured products
            if (recommendations.length < 4) {
                const featuredProducts = ProductDataStore.getFeaturedProducts()
                    .filter(p => !this.isInCart(p.id))
                    .slice(0, 4 - recommendations.length);
                recommendations = recommendations.concat(featuredProducts);
            }

            this.renderRecommendations(recommendations.slice(0, 4));
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        }
    }

    isInCart(productId) {
        return this.cartItems.some(item => item.product_id === productId);
    }

    renderRecommendations(products) {
        const container = document.getElementById('cart-recommendations');
        if (!container) return;

        container.innerHTML = '';

        products.forEach(product => {
            const recElement = document.createElement('div');
            recElement.className = 'recommendation-card';

            recElement.innerHTML = `
                <img src="${product.image || '/shop/images/placeholder.jpg'}" alt="${product.name}" loading="lazy">
                <div class="recommendation-info">
                    <div class="recommendation-name">${product.name}</div>
                    <div class="recommendation-price">$${product.price.toFixed(2)}</div>
                    <button class="recommendation-add-btn" onclick="cartManager.addRecommendedItem('${product.id}')">
                        Add to Cart
                    </button>
                </div>
            `;

            container.appendChild(recElement);
        });
    }

    async addRecommendedItem(productId) {
        try {
            await ShopAPI.addToCart(productId, 1);
            this.showSuccess('Item added to cart!');
            await this.loadCart();
            this.updateCartDisplay();
            this.updateCartCount();
            this.loadRecommendations(); // Refresh recommendations
        } catch (error) {
            console.error('Failed to add recommended item:', error);
            this.showError('Failed to add item to cart.');
        }
    }

    toggleCartSidebar() {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('overlay');

        if (sidebar.classList.contains('open')) {
            this.closeCartSidebar();
        } else {
            this.renderSidebarCartItems(document.getElementById('sidebar-cart-items'));
            sidebar.classList.add('open');
            overlay.classList.add('show');
        }
    }

    closeCartSidebar() {
        document.getElementById('cart-sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
    }

    updateCartCount() {
        const count = HackerUtils.getCartItemCount();
        const cartCountEls = document.querySelectorAll('.cart-count');
        cartCountEls.forEach(el => {
            el.textContent = count;
            el.style.display = count === 0 ? 'none' : 'inline-flex';
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#00ff00' : '#ff4444'};
            color: ${type === 'success' ? '#000' : '#fff'};
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            font-family: 'Courier New', monospace;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ============================================================================
// GLOBAL CART MANAGER INSTANCE
// ============================================================================

const cartManager = new CartManager();

// Make globally available
window.cartManager = cartManager;
