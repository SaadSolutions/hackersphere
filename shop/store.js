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
            // Load initial data
            await this.loadCategories();
            await this.loadFeaturedProducts();
            await this.loadAllProducts();

            // Setup event listeners
            this.setupEventListeners();

            // Update cart count
            this.updateCartCount();

            // Setup scroll animations
            this.setupScrollAnimations();

        } catch (error) {
            console.error('Failed to initialize store:', error);
            this.showError('Failed to load store data. Please refresh the page.');
        }
    }

    async loadCategories() {
        try {
            const response = await ShopAPI.getCategories();
            this.renderCategories(response.categories);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    async loadFeaturedProducts() {
        try {
            const response = await ShopAPI.getProducts({
                limit: 6,
                featured: true
            });
            this.renderFeaturedProducts(response.products);
        } catch (error) {
            console.error('Failed to load featured products:', error);
        }
    }

    async loadAllProducts() {
        try {
            const response = await ShopAPI.getProducts({
                limit: this.productsPerPage,
                offset: 0,
                sort: this.currentFilters.sort
            });

            this.allProducts = response.products;
            this.filteredProducts = [...this.allProducts];
            this.renderAllProducts(this.filteredProducts);
            this.updateSearchFilters();
        } catch (error) {
            console.error('Failed to load products:', error);
        }
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
            console.error('Failed to apply filters:', error);
            this.showError('Failed to filter products. Please try again.');
        } finally {
            this.hideLoading('all-products');
        }
    }

    setupEventListeners() {
        // Search functionality
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

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        categoryFilter.addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });

        // Sort filter
        const sortFilter = document.getElementById('sort-filter');
        sortFilter.addEventListener('change', (e) => {
            this.sortProducts(e.target.value);
        });

        // Cart functionality
        const cartButton = document.getElementById('cart-button');
        const closeCart = document.getElementById('close-cart');
        const overlay = document.getElementById('overlay');

        cartButton.addEventListener('click', () => this.toggleCart());
        closeCart.addEventListener('click', () => this.closeCart());
        overlay.addEventListener('click', () => this.closeCart());

        // Checkout button
        const checkoutButton = document.getElementById('checkout-button');
        checkoutButton.addEventListener('click', () => this.proceedToCheckout());

        // Load more featured products
        const loadMoreBtn = document.getElementById('load-more-featured');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreFeaturedProducts());
        }

        // Product modal
        const closeModal = document.getElementById('close-modal');
        closeModal.addEventListener('click', () => this.closeModal());
        overlay.addEventListener('click', () => this.closeModal());

        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        newsletterForm.addEventListener('submit', (e) => this.handleNewsletterSignup(e));
    }

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe all sections and product cards
        document.querySelectorAll('.section, .product-card, .category-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    renderCategories(categories) {
        const categoriesGrid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');

        categoriesGrid.innerHTML = '';
        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        const categoryIcons = {
            'Software': '💻',
            'Hardware': '🔧',
            'Merchandise': '👕',
            'default': '📦'
        };

        categories.forEach(category => {
            // Category cards
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.onclick = () => this.filterByCategory(category.slug);

            categoryCard.innerHTML = `
                <div class="category-icon">${categoryIcons[category.name] || categoryIcons.default}</div>
                <div class="category-name">${category.name}</div>
                <div class="category-count">${category.count} products</div>
            `;

            categoriesGrid.appendChild(categoryCard);

            // Filter options
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
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.onclick = () => this.showProductModal(product);

        const imageUrl = product.image || `/shop/images/placeholder.jpg`;

        productCard.innerHTML = `
            <div class="product-category">${product.category}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-description">${product.description}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div class="product-buttons">
                <button class="product-button primary" onclick="event.stopPropagation(); storeManager.addToCart('${product.id}')">
                    Add to Cart
                </button>
                <button class="product-button secondary" onclick="event.stopPropagation(); storeManager.showProductModal('${product.id}')">
                    View Details
                </button>
            </div>
        `;

        return productCard;
    }

    async showProductModal(product) {
        if (typeof product === 'string') {
            // Load product by ID
            try {
                const response = await ShopAPI.getProduct(product);
                product = response.data;
            } catch (error) {
                console.error('Failed to load product:', error);
                return;
            }
        }

        const modal = document.getElementById('product-modal');
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <div class="product-detail">
                <div class="product-detail-header">
                    <div class="product-detail-category">${product.category}</div>
                    <div class="product-detail-name">${product.name}</div>
                    <div class="product-detail-price">$${product.price.toFixed(2)}</div>
                </div>

                <div class="product-detail-description">
                    <h4>Description</h4>
                    <p>${product.description}</p>
                </div>

                <div class="product-detail-features">
                    <h4>Features</h4>
                    <ul>
                        ${product.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>

                <div class="product-detail-specs">
                    <h4>Specifications</h4>
                    <div class="specs-grid">
                        ${Object.entries(product.specifications).map(([key, value]) =>
                            `<div class="spec-item"><strong>${key}:</strong> ${value}</div>`
                        ).join('')}
                    </div>
                </div>

                <div class="product-detail-rating">
                    <div class="rating">
                        ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                        <span class="rating-text">${product.rating} (${product.review_count} reviews)</span>
                    </div>
                </div>

                <div class="product-detail-actions">
                    <button class="product-button primary" onclick="storeManager.addToCart('${product.id}')">
                        Add to Cart - $${product.price.toFixed(2)}
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
            const response = await ShopAPI.addToCart(productId, 1);

            // Show success message
            this.showSuccess('Product added to cart!');

            // Update cart count
            this.updateCartCount();

            // Load cart items if sidebar is open
            if (document.getElementById('cart-sidebar').classList.contains('open')) {
                await this.loadCartItems();
            }

        } catch (error) {
            console.error('Failed to add to cart:', error);
            this.showError('Failed to add product to cart. Please try again.');
        }
    }

    async updateCartCount() {
        try {
            const cartKey = 'shop_cart';
            const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

            const cartCountEl = document.getElementById('cart-count');
            cartCountEl.textContent = totalItems;

            if (totalItems === 0) {
                cartCountEl.style.display = 'none';
            } else {
                cartCountEl.style.display = 'inline-flex';
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
            this.showLoading('cart-items');
            const response = await ShopAPI.getCartItems();
            this.renderCartItems(response.items);
        } catch (error) {
            console.error('Failed to load cart items:', error);
            this.showError('Failed to load cart items.');
        } finally {
            this.hideLoading('cart-items');
        }
    }

    renderCartItems(items) {
        const cartItemsEl = document.getElementById('cart-items');
        const cartTotalEl = document.getElementById('cart-total');
        const cartFooterEl = document.getElementById('cart-footer');

        if (items.length === 0) {
            cartItemsEl.innerHTML = `
                <div class="empty-cart">
                    <span class="empty-cart-icon">🛒</span>
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
            const itemTotal = item.product.price * item.quantity;
            total += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.product.image || '/shop/images/placeholder.jpg'}" alt="${item.product.name}" loading="lazy">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.product.name}</div>
                    <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
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
        try {
            await ShopAPI.updateCartItem(productId, quantity);
            await this.loadCartItems();
            this.updateCartCount();
        } catch (error) {
            console.error('Failed to update cart item:', error);
            this.showError('Failed to update item quantity.');
        }
    }

    async removeFromCart(productId) {
        try {
            await ShopAPI.removeFromCart(productId);
            await this.loadCartItems();
            this.updateCartCount();
        } catch (error) {
            console.error('Failed to remove cart item:', error);
            this.showError('Failed to remove item from cart.');
        }
    }

    proceedToCheckout() {
        // In a real app, this would redirect to checkout page
        window.location.href = '/shop/checkout.html';
    }

    async loadMoreFeaturedProducts() {
        // Could implement loading more featured products
        // For now, just show a message
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

    hideLoading(containerId) {
        // Loading state will be replaced by actual content
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Simple notification - in a real app, you'd use a proper notification system
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

        // Mock signup - in real app, this would send to backend
        form.querySelector('button').textContent = 'Subscribing...';
        form.querySelector('button').disabled = true;

        setTimeout(() => {
            this.showSuccess('Thank you for subscribing! Check your email for confirmation.');
            form.reset();
            form.querySelector('button').textContent = 'Subscribe';
            form.querySelector('button').disabled = false;
        }, 1500);
    }
}

// ============================================================================
// NOTIFICATION ANIMATIONS
// ============================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .notification {
        font-family: 'Courier New', monospace;
    }

    .no-products {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
    }

    .no-products h3 {
        margin-bottom: 10px;
        color: var(--text-primary);
    }

    .product-detail {
        max-width: 100%;
    }

    .product-detail-header {
        margin-bottom: 30px;
        text-align: center;
    }

    .product-detail-category {
        font-size: 0.9rem;
        color: var(--gold-primary);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 10px;
    }

    .product-detail-name {
        font-size: 2.2rem;
        font-weight: bold;
        color: var(--text-primary);
        margin-bottom: 15px;
    }

    .product-detail-price {
        font-size: 2rem;
        color: var(--gold-primary);
        font-weight: bold;
        text-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
    }

    .product-detail-description,
    .product-detail-features,
    .product-detail-specs,
    .product-detail-rating {
        margin-bottom: 30px;
    }

    .product-detail-description h4,
    .product-detail-features h4,
    .product-detail-specs h4 {
        color: var(--gold-primary);
        margin-bottom: 15px;
        font-size: 1.2rem;
    }

    .product-detail-features ul {
        list-style: none;
        padding: 0;
    }

    .product-detail-features li {
        padding: 8px 0;
        border-bottom: 1px solid var(--glass-border);
        color: var(--text-secondary);
    }

    .product-detail-features li:before {
        content: "► ";
        color: var(--matrix-green);
        font-weight: bold;
    }

    .specs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
    }

    .spec-item {
        background: var(--glass-bg);
        padding: 12px 15px;
        border-radius: var(--border-radius);
        border: 1px solid var(--glass-border);
        color: var(--text-secondary);
    }

    .spec-item strong {
        color: var(--gold-primary);
    }

    .rating {
        font-size: 1.5rem;
        color: var(--gold-primary);
    }

    .rating-text {
        margin-left: 10px;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }

    .product-detail-actions {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid var(--glass-border);
    }
`;
document.head.appendChild(style);

// ============================================================================
// GLOBAL STORE MANAGER INSTANCE
// ============================================================================

const storeManager = new StoreManager();

// Make globally available
window.storeManager = storeManager;
