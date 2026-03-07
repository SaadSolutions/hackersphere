/**
 * HackerSphere Product Detail Page
 */

const API_BASE = 'http://localhost:5000/api';
let product = null;
let selectedQty = 1;

function getToken() {
  return localStorage.getItem('shop_token') || localStorage.getItem('academy_token') || '';
}

function authHeaders() {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug') || params.get('id');

  if (!slug) {
    document.getElementById('product-content').innerHTML =
      '<p style="text-align:center;color:#ff4444;">Product not found. <a href="/shop" style="color:var(--matrix-green);">Browse Shop</a></p>';
    return;
  }

  updateCartCount();
  await loadProduct(slug);
});

async function loadProduct(slug) {
  try {
    const isUUID = /^[0-9a-f-]{36}$/i.test(slug);
    const url = isUUID
      ? `${API_BASE}/shop/products/${slug}`
      : `${API_BASE}/shop/products/slug/${slug}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Not found');
    product = await res.json();

    renderProduct();
    loadReviews(product.id);
  } catch (err) {
    document.getElementById('product-content').innerHTML = `
      <div style="text-align:center;padding:60px;">
        <div style="font-size:3rem;margin-bottom:16px;">🔍</div>
        <h2 style="color:var(--text-primary);">Product Not Found</h2>
        <p style="color:var(--text-muted);">This product may have been removed or the URL is incorrect.</p>
        <a href="/shop" style="display:inline-block;margin-top:16px;padding:10px 24px;background:var(--matrix-green);color:#000;border-radius:8px;text-decoration:none;font-family:monospace;font-weight:700;">Browse Shop</a>
      </div>`;
  }
}

function renderProduct() {
  const images = Array.isArray(product.images) ? product.images : [];
  const features = Array.isArray(product.features) ? product.features : [];
  const specs = typeof product.specifications === 'object' ? product.specifications : {};
  const comparePrice = parseFloat(product.compare_price);
  const price = parseFloat(product.price);
  const savings = comparePrice > price ? ((1 - price / comparePrice) * 100).toFixed(0) : 0;
  const inStock = (product.inventory_count || 0) > 0;

  // Breadcrumb
  document.getElementById('bc-category').textContent = product.category || 'Products';
  document.getElementById('bc-product').textContent = product.name;
  document.title = `${product.name} - HackerSphere Shop`;

  document.getElementById('product-content').innerHTML = `
    <div class="product-grid">
      <!-- Gallery -->
      <div class="product-gallery">
        <img class="main-image" id="main-image"
          src="${images[0]?.url || images[0] || `https://placehold.co/800x600/0a0a0a/00ff41?text=${encodeURIComponent(product.name)}`}"
          alt="${product.name}">
        ${images.length > 1 ? `<div class="thumbnail-strip">
          ${images.map((img, i) => `
            <img class="thumbnail ${i === 0 ? 'active' : ''}"
              src="${img.url || img}" alt="View ${i+1}"
              onclick="switchImage(this, '${img.url || img}')">
          `).join('')}
        </div>` : ''}
      </div>

      <!-- Info -->
      <div class="product-info">
        <h1>${product.name}</h1>
        <div class="product-meta">
          <div class="product-rating">
            <span class="stars">${renderStars(product.rating || 0)}</span>
            <span>${(product.rating || 0).toFixed(1)}</span>
            <span style="color:var(--text-muted);">(${product.review_count || 0} reviews)</span>
          </div>
          ${product.category ? `<span class="product-category">${product.category}</span>` : ''}
        </div>

        <div class="product-price-block">
          <span class="price-current">$${price.toFixed(2)}</span>
          ${comparePrice > price ? `<span class="price-compare">$${comparePrice.toFixed(2)}</span>
            <span class="price-save">Save ${savings}%</span>` : ''}
        </div>

        <p class="product-description">${product.short_description || product.description || ''}</p>

        <div class="stock-badge ${inStock ? (product.inventory_count < 10 ? 'low-stock' : 'in-stock') : 'out-of-stock'}">
          ${inStock
            ? (product.inventory_count < 10
              ? `⚠ Low Stock — Only ${product.inventory_count} left`
              : '✓ In Stock')
            : '✗ Out of Stock'}
        </div>

        ${inStock ? `
        <div class="quantity-selector">
          <span class="qty-label">Quantity:</span>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <input class="qty-value" id="qty-value" type="number" value="1" min="1" max="${product.inventory_count}" readonly>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>
        </div>
        <button class="btn-add-cart" id="add-cart-btn" onclick="addToCart()">ADD TO CART</button>
        <button class="btn-buy-now" onclick="buyNow()">BUY NOW</button>
        ` : '<button class="btn-add-cart" disabled>OUT OF STOCK</button>'}

        ${features.length ? `
        <div class="product-features">
          <h3>Key Features</h3>
          <ul class="features-list">
            ${features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tab-nav">
        <button class="tab-btn active" onclick="switchTab(this, 'tab-desc')">Description</button>
        ${Object.keys(specs).length ? `<button class="tab-btn" onclick="switchTab(this, 'tab-specs')">Specifications</button>` : ''}
        <button class="tab-btn" onclick="switchTab(this, 'tab-reviews')">Reviews (${product.review_count || 0})</button>
      </div>

      <div class="tab-panel active" id="tab-desc">
        <p style="color:var(--text-secondary);line-height:1.8;">${product.description || product.short_description || 'No description available.'}</p>
      </div>

      ${Object.keys(specs).length ? `
      <div class="tab-panel" id="tab-specs">
        <table class="spec-table">
          ${Object.entries(specs).map(([k, v]) => `
            <tr><td>${k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')}</td><td>${v}</td></tr>
          `).join('')}
        </table>
      </div>` : ''}

      <div class="tab-panel" id="tab-reviews">
        <div id="reviews-list"><p style="color:var(--text-muted);">Loading reviews...</p></div>
        ${getToken() ? `
        <div class="review-form" style="margin-top:24px;">
          <h4>WRITE A REVIEW</h4>
          <div class="star-rating">
            ${[5,4,3,2,1].map(n => `
              <input type="radio" name="rating" id="star${n}" value="${n}">
              <label for="star${n}" title="${n} stars">★</label>
            `).join('')}
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="color:var(--text-secondary);font-size:0.85rem;">Title</label>
            <input type="text" id="review-title" placeholder="Brief summary" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--glass-border);color:var(--text-primary);padding:8px 12px;border-radius:6px;font-family:monospace;box-sizing:border-box;">
          </div>
          <textarea id="review-text" rows="4" placeholder="Share your experience..."
            style="width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--glass-border);color:var(--text-primary);padding:10px;border-radius:6px;font-family:monospace;resize:vertical;box-sizing:border-box;"></textarea>
          <button onclick="submitReview()" style="margin-top:12px;padding:10px 24px;background:var(--matrix-green);color:#000;border:none;border-radius:6px;font-family:monospace;font-weight:700;cursor:pointer;">SUBMIT REVIEW</button>
        </div>` : `
        <p style="color:var(--text-muted);margin-top:16px;font-size:0.9rem;">
          <a href="/academy/login.html" style="color:var(--matrix-green);">Log in</a> to write a review.
        </p>`}
      </div>
    </div>

    <!-- Related section placeholder -->
    <div class="related-section">
      <h2 style="color:var(--text-primary);">You May Also Like</h2>
      <div class="related-grid" id="related-grid">
        <div class="loading-skeleton"></div><div class="loading-skeleton"></div><div class="loading-skeleton"></div>
      </div>
    </div>
  `;

  loadRelated();
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
window.switchImage = (thumb, src) => {
  document.getElementById('main-image').src = src;
  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
};

// ─── Quantity ─────────────────────────────────────────────────────────────────
window.changeQty = (delta) => {
  const max = product?.inventory_count || 99;
  selectedQty = Math.max(1, Math.min(max, selectedQty + delta));
  document.getElementById('qty-value').value = selectedQty;
};

// ─── Cart ─────────────────────────────────────────────────────────────────────
window.addToCart = async () => {
  if (!getToken()) {
    localStorage.setItem('post_login_redirect', window.location.href);
    window.location.href = '/academy/login.html';
    return;
  }

  const btn = document.getElementById('add-cart-btn');
  btn.disabled = true;
  btn.textContent = 'ADDING...';

  try {
    const res = await fetch(`${API_BASE}/shop/cart`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ productId: product.id, quantity: selectedQty }),
    });
    if (!res.ok) throw new Error((await res.json()).message);
    showToast('✓ Added to cart!');
    updateCartCount();
  } catch (err) {
    showToast('Failed: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'ADD TO CART';
  }
};

window.buyNow = async () => {
  await addToCart();
  window.location.href = '/shop/checkout.html';
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
window.switchTab = (btn, targetId) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(targetId).classList.add('active');
};

// ─── Reviews ─────────────────────────────────────────────────────────────────
async function loadReviews(productId) {
  try {
    const res = await fetch(`${API_BASE}/shop/products/${productId}/reviews`);
    const data = await res.json();
    const container = document.getElementById('reviews-list');
    if (!container) return;

    if (!data.reviews?.length) {
      container.innerHTML = '<p style="color:var(--text-muted);">No reviews yet. Be the first!</p>';
      return;
    }

    container.innerHTML = data.reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <img src="${r.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.username)}&size=32&background=001100&color=00ff41`}"
            width="32" height="32" style="border-radius:50%;" alt="${r.username}">
          <span class="reviewer-name">${r.username}</span>
          <span class="stars" style="font-size:0.9rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
          <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        ${r.title ? `<div style="color:var(--text-primary);font-weight:600;margin-bottom:4px;">${r.title}</div>` : ''}
        <div class="review-text">${r.comment || ''}</div>
      </div>`).join('');
  } catch (_) {}
}

window.submitReview = async () => {
  const ratingEl = document.querySelector('input[name="rating"]:checked');
  if (!ratingEl) { showToast('Please select a rating', true); return; }

  try {
    const res = await fetch(`${API_BASE}/shop/products/${product.id}/reviews`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        rating: parseInt(ratingEl.value),
        title: document.getElementById('review-title').value,
        comment: document.getElementById('review-text').value,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).message);
    showToast('✓ Review submitted!');
    loadReviews(product.id);
  } catch (err) {
    showToast('Failed: ' + err.message, true);
  }
};

// ─── Related ──────────────────────────────────────────────────────────────────
async function loadRelated() {
  try {
    const res = await fetch(`${API_BASE}/shop/products?category=${encodeURIComponent(product.category || '')}&limit=4`);
    const data = await res.json();
    const items = (data.products || []).filter(p => p.id !== product.id).slice(0, 3);
    const grid = document.getElementById('related-grid');
    if (!grid || !items.length) return;

    grid.innerHTML = items.map(p => {
      const img = Array.isArray(p.images) ? (p.images[0]?.url || p.images[0]) : '';
      return `
        <a href="product.html?slug=${p.slug}" class="product-card" style="text-decoration:none;">
          <img src="${img || `https://placehold.co/400x300/0a0a0a/00ff41?text=${encodeURIComponent(p.name)}`}"
            style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px 8px 0 0;" alt="${p.name}">
          <div style="padding:12px;">
            <div style="color:var(--text-primary);font-weight:600;margin-bottom:4px;">${p.name}</div>
            <div style="color:var(--matrix-green);font-family:monospace;font-weight:700;">$${parseFloat(p.price).toFixed(2)}</div>
          </div>
        </a>`;
    }).join('');
  } catch (_) {}
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = isError ? '#ff4444' : 'var(--matrix-green)';
  t.style.color = isError ? '#ff4444' : 'var(--matrix-green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function updateCartCount() {
  try {
    const res = await fetch(`${API_BASE}/shop/cart`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      const badge = document.getElementById('cart-count');
      if (badge && data.itemCount) {
        badge.textContent = data.itemCount;
        badge.style.display = 'inline';
      }
    }
  } catch (_) {}
}
