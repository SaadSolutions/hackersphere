/**
 * HackerSphere Checkout Flow
 * Handles cart display, shipping, discount codes, and Stripe payment
 */

const API_BASE = 'http://localhost:5000/api';
let stripeInstance = null;
let cardElement = null;
let cartItems = [];
let discountData = null;
let selectedShipping = { method: 'standard', price: 9.99 };

// ─── Token helper ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('shop_token') || localStorage.getItem('academy_token') || '';
}

function authHeaders() {
  const token = getToken();
  return token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  if (!getToken()) {
    localStorage.setItem('post_login_redirect', '/shop/checkout.html');
    window.location.href = '/academy/login.html';
    return;
  }

  await loadCart();
  initStripe();
  initShippingOptions();
  initDiscountCode();
  prefillUserData();
  updateTotals();
});

// ─── Cart Loading ─────────────────────────────────────────────────────────────
async function loadCart() {
  try {
    const res = await fetch(`${API_BASE}/shop/cart`, { headers: authHeaders() });
    const data = await res.json();
    cartItems = data.items || [];

    if (!cartItems.length) {
      // Try localStorage backup
      const backup = localStorage.getItem('shop_cart_backup');
      if (backup) {
        try { cartItems = JSON.parse(backup).items || []; } catch (_) {}
      }
    }

    if (!cartItems.length) {
      window.location.href = '/shop/cart.html';
      return;
    }

    renderSummaryItems();
    updateTotals();
    document.getElementById('place-order-btn').disabled = false;
  } catch (err) {
    // Fallback to local storage cart
    const backup = localStorage.getItem('shop_cart_backup');
    if (backup) {
      try {
        cartItems = JSON.parse(backup).items || [];
        renderSummaryItems();
        updateTotals();
        document.getElementById('place-order-btn').disabled = false;
      } catch (_) {}
    }
  }
}

function renderSummaryItems() {
  const container = document.getElementById('summary-items');
  if (!cartItems.length) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No items</p>';
    return;
  }

  container.innerHTML = cartItems.map(item => {
    const image = Array.isArray(item.images) ? item.images[0]?.url : item.images;
    const price = parseFloat(item.price || 0);
    const qty = item.quantity || 1;
    return `
      <div class="summary-item">
        <img src="${image || 'https://placehold.co/50x50/0a0a0a/00ff41?text=?'}" alt="${item.name}">
        <div class="summary-item-info">
          <div class="summary-item-name">${item.name}</div>
          <div class="summary-item-qty">Qty: ${qty}</div>
        </div>
        <div class="summary-item-price">$${(price * qty).toFixed(2)}</div>
      </div>`;
  }).join('');
}

// ─── Totals ───────────────────────────────────────────────────────────────────
function getSubtotal() {
  return cartItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
}

function updateTotals() {
  const subtotal = getSubtotal();
  const discount = discountData ? parseFloat(discountData.discountAmount) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= 100 ? 0 : selectedShipping.price;
  const tax = afterDiscount * 0.08;
  const total = afterDiscount + shipping + tax;

  document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('shipping-cost').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  document.getElementById('tax-amount').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;

  if (discountData) {
    document.getElementById('discount-row').style.display = 'flex';
    document.getElementById('discount-amount').textContent = `-$${discount.toFixed(2)}`;
  } else {
    document.getElementById('discount-row').style.display = 'none';
  }

  if (afterDiscount >= 100) {
    document.querySelector('[data-method="free"]')?.classList.add('show');
  }
}

// ─── Shipping Options ─────────────────────────────────────────────────────────
function initShippingOptions() {
  document.querySelectorAll('.shipping-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.shipping-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input[type="radio"]').checked = true;
      selectedShipping = {
        method: option.dataset.method,
        price: parseFloat(option.dataset.price),
      };
      updateTotals();
    });
  });
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
function initStripe() {
  const stripeKey = window.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

  if (window.Stripe && stripeKey !== 'pk_test_placeholder') {
    stripeInstance = Stripe(stripeKey);
    const elements = stripeInstance.elements();
    cardElement = elements.create('card', {
      style: {
        base: {
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          fontSize: '16px',
          '::placeholder': { color: '#888888' },
        },
        invalid: { color: '#ff4444' },
      },
    });
    cardElement.mount('#card-element');
    cardElement.on('change', (event) => {
      const errorDiv = document.getElementById('card-errors');
      errorDiv.textContent = event.error ? event.error.message : '';
    });
  } else {
    // Dev fallback: show mock card UI
    document.getElementById('card-element').innerHTML = `
      <div style="padding: 12px; background: rgba(0,255,0,0.05); border: 1px dashed rgba(0,255,0,0.3); border-radius: 6px; font-family: 'Courier New', monospace; color: var(--text-muted); text-align: center;">
        <div>💳 Test Mode: Stripe not configured</div>
        <div style="font-size: 0.8rem; margin-top: 4px;">Orders will be processed in demo mode</div>
      </div>`;
  }
}

// ─── Discount Code ────────────────────────────────────────────────────────────
function initDiscountCode() {
  document.getElementById('apply-discount').addEventListener('click', async () => {
    const code = document.getElementById('discount-code').value.trim();
    const msgEl = document.getElementById('discount-msg');

    if (!code) return;

    try {
      const subtotal = getSubtotal();
      const res = await fetch(`${API_BASE}/shop/discounts/apply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code, orderAmount: subtotal }),
      });
      const data = await res.json();

      if (!res.ok) {
        msgEl.style.display = 'block';
        msgEl.className = '';
        msgEl.style.color = '#ff4444';
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.fontFamily = 'monospace';
        msgEl.textContent = data.message || 'Invalid discount code';
        discountData = null;
      } else {
        discountData = data;
        msgEl.style.display = 'block';
        msgEl.style.color = 'var(--matrix-green)';
        msgEl.style.fontSize = '0.85rem';
        msgEl.style.fontFamily = 'monospace';
        msgEl.textContent = `✓ ${data.discountValue}${data.discountType === 'percent' ? '%' : '$'} off applied!`;
        updateTotals();
      }
    } catch (err) {
      msgEl.style.display = 'block';
      msgEl.style.color = '#ff4444';
      msgEl.textContent = 'Failed to apply discount';
    }
  });
}

// ─── Prefill ──────────────────────────────────────────────────────────────────
async function prefillUserData() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
    if (res.ok) {
      const user = await res.json();
      document.getElementById('first-name').value = user.firstName || '';
      document.getElementById('last-name').value = user.lastName || '';
      document.getElementById('email').value = user.email || '';
    }
  } catch (_) {}
}

// ─── Form Validation ──────────────────────────────────────────────────────────
function getShippingAddress() {
  const fields = [
    { id: 'first-name', err: 'err-first-name' },
    { id: 'last-name', err: 'err-last-name' },
    { id: 'email', err: 'err-email' },
    { id: 'address-line1', err: 'err-address' },
    { id: 'city', err: 'err-city' },
    { id: 'state', err: 'err-state' },
    { id: 'postal-code', err: 'err-postal' },
  ];

  let valid = true;
  fields.forEach(({ id, err }) => {
    const el = document.getElementById(id);
    const errEl = document.getElementById(err);
    el.classList.remove('error');
    if (errEl) errEl.style.display = 'none';

    if (!el.value.trim()) {
      el.classList.add('error');
      if (errEl) errEl.style.display = 'block';
      valid = false;
    }
  });

  const emailEl = document.getElementById('email');
  if (emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    emailEl.classList.add('error');
    document.getElementById('err-email').style.display = 'block';
    valid = false;
  }

  if (!valid) return null;

  return {
    firstName: document.getElementById('first-name').value.trim(),
    lastName: document.getElementById('last-name').value.trim(),
    email: document.getElementById('email').value.trim(),
    line1: document.getElementById('address-line1').value.trim(),
    line2: document.getElementById('address-line2').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    postalCode: document.getElementById('postal-code').value.trim(),
    country: document.getElementById('country').value,
  };
}

// ─── Place Order ──────────────────────────────────────────────────────────────
document.getElementById('place-order-btn').addEventListener('click', async () => {
  const address = getShippingAddress();
  if (!address) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const btnText = document.getElementById('btn-text');
  const btnLoading = document.getElementById('btn-loading');
  const btn = document.getElementById('place-order-btn');

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';

  try {
    const subtotal = getSubtotal();
    const discount = discountData ? parseFloat(discountData.discountAmount) : 0;
    const afterDiscount = subtotal - discount;
    const shipping = afterDiscount >= 100 ? 0 : selectedShipping.price;
    const tax = afterDiscount * 0.08;
    const total = afterDiscount + shipping + tax;

    // Get payment intent
    let paymentIntentId = `pi_demo_${Date.now()}`;

    if (stripeInstance && cardElement) {
      const intentRes = await fetch(`${API_BASE}/shop/payment/intent`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amount: total.toFixed(2), currency: 'usd' }),
      });
      const intentData = await intentRes.json();

      if (intentData.clientSecret && !intentData.clientSecret.includes('mock')) {
        const { paymentIntent, error } = await stripeInstance.confirmCardPayment(
          intentData.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: `${address.firstName} ${address.lastName}`,
                email: address.email,
              },
            },
          }
        );

        if (error) {
          document.getElementById('card-errors').textContent = error.message;
          btn.disabled = false;
          btnText.style.display = 'inline';
          btnLoading.style.display = 'none';
          return;
        }
        paymentIntentId = paymentIntent.id;
      } else {
        paymentIntentId = intentData.paymentIntentId || paymentIntentId;
      }
    }

    // Create order
    const orderRes = await fetch(`${API_BASE}/shop/orders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        shippingAddress: address,
        shippingMethod: selectedShipping.method,
        paymentIntentId,
        discountCode: discountData?.code || null,
        notes: '',
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      throw new Error(orderData.message || 'Order failed');
    }

    // Clear cart
    localStorage.removeItem('shop_cart_backup');
    localStorage.removeItem('cart_count');

    // Show success
    const orderId = orderData.order?.id || 'HS-' + Date.now();
    document.getElementById('confirm-order-id').textContent = `Order #${orderId.slice(0, 8).toUpperCase()}`;
    document.getElementById('success-overlay').classList.add('show');

  } catch (err) {
    alert('Order failed: ' + err.message);
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
});
