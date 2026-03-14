/**
 * HACKERSPHERE SHOP STORE MANAGEMENT
 * Product catalog rendering and interaction handling
 */

class StoreManager {
    constructor() {
        this.currentPage = 1;
        this.productsPerPage = 12;
        this.currentFilters = {
            search: '',
            category: '',
            sort: 'newest'
        };
        this.allProducts = [];
        this.filteredProducts = [];
        this.cartCount = 0;

        this.init();
    }

    async init() {
        try {
            await this.loadCategories();
            await this.loadFeaturedProducts();
            await this.loadAllProducts();
            this.setupEventListeners();
            this.updateCartCount();
            this.setupScrollAnimations();
        } catch (error) {
            console.error('Failed to initialize store:', error);
            this.showError('Failed to load store data. Please refresh the page.');
        }
    }

    getMockProducts() {
        return window.MOCK_PRODUCTS || [];
    }

    getMockCategories() {
        return window.MOCK_CATEGORIES || [];
    }

    async loadCategories() {
        try {
            const response = await ShopAPI.getCategories();
            if (response.categories && response.categories.length > 0) {
                this.renderCategories(response.categories);
                return;
            }
        } catch (error) {
            console.warn('API unavailable, using mock categories:', error.message);
        }
        // Fallback to mock
        const mockCategories = this.getMockCategories();
        if (mockCategories.length > 0) {
            this.renderCategories(mockCategories);
        }
    }

    async loadFeaturedProducts() {
        try {
            const response = await ShopAPI.getProducts({ limit: 6, featured: true });
            if (response.products && response.products.length > 0) {
                this.renderFeaturedProducts(response.products);
                return;
            }
        } catch (error) {
            console.warn('API unavailable, using mock featured products:', error.message);
        }
        // Fallback to mock
        const featured = this.getMockProducts().filter(p => p.is_featured);
        this.renderFeaturedProducts(featured);
    }

    async loadAllProducts() {
        try {
            const response = await ShopAPI.getProducts({
                limit: this.productsPerPage,
                offset: 0,
                sort: this.currentFilters.sort
            });
            if (response.products && response.products.length > 0) {
                this.allProducts = response.products;
                this.filteredProducts = [...this.allProducts];
                this.renderAllProducts(this.filteredProducts);
                this.updateSearchFilters();
                return;
            }
        } catch (error) {
            console.warn('API unavailable, using mock products:', error.message);
        }
        // Fallback to mock
        this.allProducts = this.getMockProducts();
        this.filteredProducts = [...this.allProducts];
        this.renderAllProducts(this.filteredProducts);
        this.updateSearchFilters();
    }

    async searchProducts(searchTerm) {
        this.currentFilters.search = searchTerm;
        await this.applyFilters();
    }

    async filterByCategory(category) {
        this.currentFilters.category = category;
        await this.applyFilters();
    }

    async sortProducts(sortBy) {
        this.currentFilters.sort = sortBy;
        await this.applyFilters();
    }

    async applyFilters() {
        try {
            this.showLoading('all-products');
            const response = await ShopAPI.getProducts({
                search: this.currentFilters.search,
                category: this.currentFilters.category,
                sort: this.currentFilters.sort,
                limit: this.productsPerPage,
                offset: 0
            });
            this.filteredProducts = response.products;
            this.renderAllProducts(this.filteredProducts);
            this.updateSearchFilters();
        } catch (error) {
            // Fallback: filter mock data locally
            let products = [...this.getMockProducts()];
            const search = this.currentFilters.search.toLowerCase();
            const category = this.currentFilters.category;

            if (search) {
                products = products.filter(p =>
                    p.name.toLowerCase().includes(search) ||
                    p.description.toLowerCase().includes(search)
                );
            }
            if (category) {
                products = products.filter(p =>
                    p.category.toLowerCase().replace(/\s+/g, '-') === category ||
                    p.category.toLowerCase() === category.toLowerCase()
                );
            }

            this.filteredProducts = products;
            this.renderAllProducts(this.filteredProducts);
            this.updateSearchFilters();
        } finally {
            this.hideLoading('all-products');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');

        searchButton.addEventListener('click', () => {
            this.searchProducts(searchInput.value.trim());
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchProducts(searchInput.value.trim());
            }
        });

        const categoryFilter = document.getElementById('category-filter');
        categoryFilter.addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });

        const sortFilter = document.getElementById('sort-filter');
        sortFilter.addEventListener('change', (e) => {
            this.sortProducts(e.target.value);
        });

        const cartButton = document.getElementById('cart-button');
        const closeCart = document.getElementById('close-cart');
        const overlay = document.getElementById('overlay');

        cartButton.addEventListener('click', () => this.toggleCart());
        closeCart.addEventListener('click', () => this.closeCart());
        overlay.addEventListener('click', () => {
            this.closeCart();
            this.closeModal();
        });

        const checkoutButton = document.getElementById('checkout-button');
        checkoutButton.addEventListener('click', () => this.proceedToCheckout());

        const loadMoreBtn = document.getElementById('load-more-featured');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreFeaturedProducts());
        }

        const closeModal = document.getElementById('close-modal');
        closeModal.addEventListener('click', () => this.closeModal());

        const newsletterForm = document.getElementById('newsletter-form');
        newsletterForm.addEventListener('submit', (e) => this.handleNewsletterSignup(e));
    }

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.section, .product-card, .category-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
            observer.observe(el);
        });
    }

    renderCategories(categories) {
        const categoriesGrid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');

        categoriesGrid.innerHTML = '';
        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        const categoryIcons = {
            'Software': '&#x1F4BB;',
            'Hardware': '&#x1F527;',
            'Merchandise': '&#x1F455;',
            'Training': '&#x1F3AF;',
            'default': '&#x1F4E6;'
        };

        categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.onclick = () => this.filterByCategory(category.slug);

            const iconHtml = categoryIcons[category.name] || categoryIcons.default;
            const count = category.count || 0;

            categoryCard.innerHTML = `
                <div class="category-icon">${iconHtml}</div>
                <div class="category-name">${this.escapeHtml(category.name)}</div>
                <div class="category-count">${count} product${count !== 1 ? 's' : ''}</div>
            `;

            categoriesGrid.appendChild(categoryCard);

            const option = document.createElement('option');
            option.value = category.slug;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }

    renderFeaturedProducts(products) {
        const featuredGrid = document.getElementById('featured-products');
        featuredGrid.innerHTML = '';

        products.forEach(product => {
            const productCard = this.createProductCard(product);
            featuredGrid.appendChild(productCard);
        });
    }

    renderAllProducts(products) {
        const productsGrid = document.getElementById('all-products');
        productsGrid.innerHTML = '';

        if (products.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        products.forEach(product => {
            const productCard = this.createProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => this.showProductModal(product);

        const categoryIcons = {
            'Software': '&#x1F4BB;',
            'Hardware': '&#x1F527;',
            'Training': '&#x1F3AF;',
            'Merchandise': '&#x1F455;'
        };
        const icon = categoryIcons[product.category] || '&#x1F4E6;';

        // Sale badge
        let badgeHtml = '';
        if (product.compare_price && product.compare_price > product.price) {
            const discount = Math.round((1 - product.price / product.compare_price) * 100);
            badgeHtml = `<span class="product-badge sale">${discount}% OFF</span>`;
        } else if (product.is_featured) {
            badgeHtml = `<span class="product-badge featured">Featured</span>`;
        }

        // Image area
        const imageHtml = product.image
            ? `<img src="${this.escapeHtml(product.image)}" alt="${this.escapeHtml(product.name)}" loading="lazy">`
            : `<span class="product-icon">${icon}</span>`;

        // Star rating
        const rating = product.rating || 0;
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        const starsHtml = '&#9733;'.repeat(fullStars) + (halfStar ? '&#9733;' : '') + '&#9734;'.repeat(emptyStars);
        const reviewCount = product.review_count || 0;

        // Price
        const priceHtml = product.compare_price && product.compare_price > product.price
            ? `<span class="product-compare-price">$${product.compare_price.toFixed(2)}</span>`
            : '';

        const safeId = this.escapeHtml(product.id);

        card.innerHTML = `
            <div class="product-image-wrap">
                ${badgeHtml}
                ${imageHtml}
            </div>
            <div class="product-body">
                <div class="product-category">${this.escapeHtml(product.category)}</div>
                <div class="product-name">${this.escapeHtml(product.name)}</div>
                <div class="product-description">${this.escapeHtml(product.short_description || product.description)}</div>
                <div class="product-rating">
                    <span class="stars">${starsHtml}</span>
                    <span class="review-count">(${reviewCount})</span>
                </div>
                <div class="product-price-row">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    ${priceHtml}
                </div>
                <div class="product-buttons">
                    <button class="product-button" onclick="event.stopPropagation(); storeManager.addToCart('${safeId}')">
                        Add to Cart
                    </button>
                    <button class="product-button secondary" onclick="event.stopPropagation(); storeManager.showProductModal('${safeId}')">
                        Details
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    async showProductModal(product) {
        if (typeof product === 'string') {
            // Try API first, then fall back to mock
            try {
                const response = await ShopAPI.getProduct(product);
                product = response.data;
            } catch (error) {
                product = this.getMockProducts().find(p => p.id === product);
                if (!product) {
                    this.showError('Product not found.');
                    return;
                }
            }
        }

        const modal = document.getElementById('product-modal');
        const modalBody = document.getElementById('modal-body');

        const rating = product.rating || 0;
        const fullStars = Math.floor(rating);
        const emptyStars = 5 - fullStars;
        const starsHtml = '&#9733;'.repeat(fullStars) + '&#9734;'.repeat(emptyStars);

        const featuresHtml = (product.features || [])
            .map(f => `<li>${this.escapeHtml(f)}</li>`).join('');

        const specsHtml = product.specifications
            ? Object.entries(product.specifications)
                .map(([key, val]) => `<div class="spec-item"><strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(String(val))}</div>`)
                .join('')
            : '';

        const compareHtml = product.compare_price && product.compare_price > product.price
            ? `<span class="product-compare-price" style="font-size:1.1rem;margin-left:10px;">$${product.compare_price.toFixed(2)}</span>`
            : '';

        modalBody.innerHTML = `
            <div class="product-detail">
                <div class="product-detail-header">
                    <div class="product-detail-category">${this.escapeHtml(product.category)}</div>
                    <div class="product-detail-name">${this.escapeHtml(product.name)}</div>
                    <div style="display:flex;align-items:baseline;justify-content:center;gap:8px;">
                        <div class="product-detail-price">$${product.price.toFixed(2)}</div>
                        ${compareHtml}
                    </div>
                </div>

                <div class="product-detail-description">
                    <h4>Description</h4>
                    <p>${this.escapeHtml(product.description)}</p>
                </div>

                ${featuresHtml ? `
                <div class="product-detail-features">
                    <h4>Features</h4>
                    <ul>${featuresHtml}</ul>
                </div>` : ''}

                ${specsHtml ? `
                <div class="product-detail-specs">
                    <h4>Specifications</h4>
                    <div class="specs-grid">${specsHtml}</div>
                </div>` : ''}

                <div class="product-detail-rating">
                    <div class="rating">
                        ${starsHtml}
                        <span class="rating-text">${rating} (${product.review_count || 0} reviews)</span>
                    </div>
                </div>

                <div class="product-detail-actions">
                    <button class="product-button" style="padding:14px 32px;font-size:1rem;" onclick="storeManager.addToCart('${this.escapeHtml(product.id)}')">
                        Add to Cart &mdash; $${product.price.toFixed(2)}
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    closeModal() {
        document.getElementById('product-modal').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    async addToCart(productId) {
        try {
            await ShopAPI.addToCart(productId, 1);
            this.showSuccess('Product added to cart!');
            this.updateCartCount();
            if (document.getElementById('cart-sidebar').classList.contains('open')) {
                await this.loadCartItems();
            }
        } catch (error) {
            // Mock cart fallback
            const cartKey = 'shop_cart';
            const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            const existing = cart.find(item => item.product_id === productId);
            if (existing) {
                existing.quantity += 1;
            } else {
                const product = this.getMockProducts().find(p => p.id === productId);
                if (product) {
                    cart.push({
                        product_id: productId,
                        quantity: 1,
                        product: {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image
                        }
                    });
                }
            }
            localStorage.setItem(cartKey, JSON.stringify(cart));
            this.showSuccess('Product added to cart!');
            this.updateCartCount();
            if (document.getElementById('cart-sidebar').classList.contains('open')) {
                this.renderLocalCart();
            }
        }
    }

    async updateCartCount() {
        try {
            const cartKey = 'shop_cart';
            const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

            const cartCountEl = document.getElementById('cart-count');
            const mobileCartCount = document.getElementById('mobile-cart-count');
            cartCountEl.textContent = totalItems;
            if (mobileCartCount) mobileCartCount.textContent = totalItems;

            if (totalItems === 0) {
                cartCountEl.style.display = 'none';
                if (mobileCartCount) mobileCartCount.style.display = 'none';
            } else {
                cartCountEl.style.display = 'inline-flex';
                if (mobileCartCount) mobileCartCount.style.display = 'inline-flex';
            }

            this.cartCount = totalItems;
        } catch (error) {
            console.error('Failed to update cart count:', error);
        }
    }

    async toggleCart() {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('overlay');

        if (sidebar.classList.contains('open')) {
            this.closeCart();
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('show');
            await this.loadCartItems();
        }
    }

    closeCart() {
        document.getElementById('cart-sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
    }

    async loadCartItems() {
        try {
            const response = await ShopAPI.getCartItems();
            this.renderCartItems(response.items);
        } catch (error) {
            this.renderLocalCart();
        }
    }

    renderLocalCart() {
        const cartKey = 'shop_cart';
        const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        this.renderCartItems(cart);
    }

    renderCartItems(items) {
        const cartItemsEl = document.getElementById('cart-items');
        const cartTotalEl = document.getElementById('cart-total');
        const cartFooterEl = document.getElementById('cart-footer');

        if (!items || items.length === 0) {
            cartItemsEl.innerHTML = `
                <div class="empty-cart">
                    <span class="empty-cart-icon">&#x1F6D2;</span>
                    <p>Your cart is empty</p>
                    <p class="empty-cart-subtext">Add some elite gear to get started</p>
                </div>
            `;
            cartFooterEl.style.display = 'none';
            return;
        }

        cartItemsEl.innerHTML = '';
        let total = 0;

        items.forEach(item => {
            const product = item.product || {};
            const price = product.price || 0;
            const itemTotal = price * item.quantity;
            total += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${product.image || '/shop/images/placeholder.jpg'}" alt="${this.escapeHtml(product.name || '')}" loading="lazy">
                <div class="cart-item-details">
                    <div class="cart-item-name">${this.escapeHtml(product.name || 'Product')}</div>
                    <div class="cart-item-price">$${price.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-quantity">
                        <button class="quantity-btn" onclick="storeManager.updateCartItem('${item.product_id}', ${item.quantity - 1})">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="storeManager.updateCartItem('${item.product_id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-item" onclick="storeManager.removeFromCart('${item.product_id}')">&times;</button>
                </div>
            `;
            cartItemsEl.appendChild(cartItem);
        });

        cartTotalEl.textContent = `$${total.toFixed(2)}`;
        cartFooterEl.style.display = 'block';
    }

    async updateCartItem(productId, quantity) {
        if (quantity <= 0) {
            return this.removeFromCart(productId);
        }
        try {
            await ShopAPI.updateCartItem(productId, quantity);
            await this.loadCartItems();
            this.updateCartCount();
        } catch (error) {
            // Local fallback
            const cartKey = 'shop_cart';
            const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            const item = cart.find(i => i.product_id === productId);
            if (item) item.quantity = quantity;
            localStorage.setItem(cartKey, JSON.stringify(cart));
            this.renderLocalCart();
            this.updateCartCount();
        }
    }

    async removeFromCart(productId) {
        try {
            await ShopAPI.removeFromCart(productId);
            await this.loadCartItems();
            this.updateCartCount();
        } catch (error) {
            const cartKey = 'shop_cart';
            let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            cart = cart.filter(i => i.product_id !== productId);
            localStorage.setItem(cartKey, JSON.stringify(cart));
            this.renderLocalCart();
            this.updateCartCount();
        }
    }

    proceedToCheckout() {
        window.location.href = '/shop/checkout.html';
    }

    async loadMoreFeaturedProducts() {
        this.showSuccess('All featured products are already loaded!');
    }

    updateSearchFilters() {
        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');
        const sortFilter = document.getElementById('sort-filter');

        searchInput.value = this.currentFilters.search;
        categoryFilter.value = this.currentFilters.category;
        sortFilter.value = this.currentFilters.sort;
    }

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
            `;
        }
    }

    hideLoading() { /* replaced by content render */ }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    showSuccess(message) { this.showNotification(message, 'success'); }
    showError(message) { this.showNotification(message, 'error'); }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        const bg = type === 'success' ? 'var(--neon, #00ff88)' : '#ff4466';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${bg};
            color: #000;
            padding: 14px 24px;
            border-radius: 10px;
            z-index: 10000;
            font-weight: 600;
            font-size: 0.9rem;
            font-family: inherit;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            animation: slideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async handleNewsletterSignup(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;

        if (!email) {
            this.showError('Please enter your email address.');
            return;
        }

        form.querySelector('button').textContent = 'Subscribing...';
        form.querySelector('button').disabled = true;

        setTimeout(() => {
            this.showSuccess('Thank you for subscribing!');
            form.reset();
            form.querySelector('button').textContent = 'Subscribe';
            form.querySelector('button').disabled = false;
        }, 1500);
    }
}

// ============================================================================
// ANIMATIONS
// ============================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }

    .no-products {
        grid-column: 1 / -1;
        text-align: center;
        padding: 64px 24px;
        color: var(--text-secondary);
    }
    .no-products h3 {
        margin-bottom: 8px;
        color: var(--text-primary);
        font-size: 1.3rem;
    }

    .product-detail { max-width: 100%; }
    .product-detail-header {
        margin-bottom: 28px;
        text-align: center;
    }
    .product-detail-category {
        font-size: 0.8rem;
        color: var(--cyan, #00e5ff);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        margin-bottom: 8px;
    }
    .product-detail-name {
        font-size: 2rem;
        font-weight: 800;
        color: var(--text-primary);
        margin-bottom: 12px;
        letter-spacing: -0.02em;
    }
    .product-detail-price {
        font-size: 1.8rem;
        color: var(--neon, #00ff88);
        font-weight: 800;
    }
    .product-detail-description,
    .product-detail-features,
    .product-detail-specs,
    .product-detail-rating {
        margin-bottom: 24px;
    }
    .product-detail-description h4,
    .product-detail-features h4,
    .product-detail-specs h4 {
        color: var(--text-primary);
        margin-bottom: 12px;
        font-size: 1rem;
        font-weight: 700;
    }
    .product-detail-features ul {
        list-style: none;
        padding: 0;
    }
    .product-detail-features li {
        padding: 8px 0;
        border-bottom: 1px solid var(--border, rgba(0,255,136,0.08));
        color: var(--text-secondary);
        font-size: 0.95rem;
    }
    .product-detail-features li:before {
        content: "\\25B8 ";
        color: var(--neon, #00ff88);
        font-weight: bold;
        margin-right: 8px;
    }
    .specs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 10px;
    }
    .spec-item {
        background: rgba(0,255,136,0.04);
        padding: 12px 16px;
        border-radius: 10px;
        border: 1px solid var(--border, rgba(0,255,136,0.08));
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
    .spec-item strong {
        color: var(--neon, #00ff88);
    }
    .rating {
        font-size: 1.3rem;
        color: var(--gold, #f0c040);
    }
    .rating-text {
        margin-left: 8px;
        font-size: 0.85rem;
        color: var(--text-secondary);
    }
    .product-detail-actions {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid var(--border, rgba(0,255,136,0.08));
    }
`;
document.head.appendChild(style);

// ============================================================================
// GLOBAL STORE MANAGER INSTANCE
// ============================================================================

const storeManager = new StoreManager();
window.storeManager = storeManager;
