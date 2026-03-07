const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Products ────────────────────────────────────────────────────────────────

// GET /api/shop/products
router.get('/products', async (req, res) => {
  try {
    const {
      page = 1, limit = 12, search = '', category = '',
      sort = 'created_at', featured = '', minPrice, maxPrice,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['p.is_active = true'];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`p.category ILIKE $${idx}`);
      params.push(category);
      idx++;
    }
    if (featured === 'true') {
      conditions.push('p.is_featured = true');
    }
    if (minPrice) {
      conditions.push(`p.price >= $${idx}`);
      params.push(parseFloat(minPrice));
      idx++;
    }
    if (maxPrice) {
      conditions.push(`p.price <= $${idx}`);
      params.push(parseFloat(maxPrice));
      idx++;
    }

    const orderMap = {
      'created_at': 'p.created_at DESC',
      'price_asc': 'p.price ASC',
      'price_desc': 'p.price DESC',
      'rating': 'p.rating DESC',
      'name': 'p.name ASC',
    };
    const orderBy = orderMap[sort] || 'p.created_at DESC';
    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT p.id, p.slug, p.name, p.short_description, p.price, p.compare_price,
              p.category, p.inventory_count, p.images, p.rating, p.review_count,
              p.is_featured, p.tags, p.created_at
       FROM products p ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      products: result.rows,
      totalCount: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// GET /api/shop/products/slug/:slug
router.get('/products/slug/:slug', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM products WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// GET /api/shop/products/:productId
router.get('/products/:productId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [req.params.productId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// GET /api/shop/products/:productId/variants
router.get('/products/:productId/variants', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM product_variants WHERE product_id = $1',
      [req.params.productId]
    );
    res.json({ variants: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch variants' });
  }
});

// GET /api/shop/products/:productId/reviews
router.get('/products/:productId/reviews', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.title, r.comment, r.created_at, r.is_verified,
              u.username, u.avatar_url
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC LIMIT 50`,
      [req.params.productId]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// POST /api/shop/products/:productId/reviews
router.post('/products/:productId/reviews', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 }),
  body('title').optional().trim().isLength({ max: 300 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid review data' });

  const { rating, comment, title } = req.body;
  try {
    await query(
      `INSERT INTO reviews (product_id, user_id, rating, title, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_id, user_id) DO UPDATE SET rating = $3, title = $4, comment = $5`,
      [req.params.productId, req.user.id, rating, title || null, comment || null]
    );
    // Update product rating
    await query(
      `UPDATE products SET
         rating = (SELECT AVG(rating) FROM reviews WHERE product_id = $1),
         review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
       WHERE id = $1`,
      [req.params.productId]
    );
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit review' });
  }
});

// GET /api/shop/categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      `SELECT pc.*, COUNT(p.id) AS product_count
       FROM product_categories pc
       LEFT JOIN products p ON p.category = pc.name AND p.is_active = true
       GROUP BY pc.id ORDER BY pc.name`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// GET /api/shop/inventory/check/:productId
router.get('/inventory/check/:productId', async (req, res) => {
  try {
    const result = await query(
      'SELECT inventory_count FROM products WHERE id = $1',
      [req.params.productId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json({ inStock: result.rows[0].inventory_count > 0, quantity: result.rows[0].inventory_count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check inventory' });
  }
});

// ─── Cart ────────────────────────────────────────────────────────────────────

// GET /api/shop/cart
router.get('/cart', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT ci.id, ci.quantity, ci.product_id, ci.variant_id,
              p.name, p.slug, p.price, p.images, p.inventory_count
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    const items = result.rows.map(item => ({
      ...item,
      subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
    }));
    res.json({ items, itemCount: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});

// POST /api/shop/cart
router.post('/cart', authenticate, [
  body('productId').notEmpty(),
  body('quantity').isInt({ min: 1, max: 99 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid cart data' });

  const { productId, quantity = 1, variantId = null } = req.body;
  try {
    const product = await query(
      'SELECT id, inventory_count FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );
    if (!product.rows.length) return res.status(404).json({ message: 'Product not found' });
    if (product.rows[0].inventory_count < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const result = await query(
      `INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id, variant_id)
       DO UPDATE SET quantity = cart_items.quantity + $4, updated_at = NOW()
       RETURNING *`,
      [req.user.id, productId, variantId, quantity]
    );
    res.status(201).json({ message: 'Added to cart', item: result.rows[0] });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
});

// PUT /api/shop/cart/:itemId
router.put('/cart/:itemId', authenticate, [
  body('quantity').isInt({ min: 1, max: 99 }),
], async (req, res) => {
  const { quantity } = req.body;
  try {
    const result = await query(
      `UPDATE cart_items SET quantity = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [quantity, req.params.itemId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Cart item not found' });
    res.json({ message: 'Cart updated', item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update cart' });
  }
});

// DELETE /api/shop/cart/:itemId
router.delete('/cart/:itemId', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [req.params.itemId, req.user.id]
    );
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove item' });
  }
});

// DELETE /api/shop/cart  (clear cart)
router.delete('/cart', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear cart' });
  }
});

// ─── Discounts ───────────────────────────────────────────────────────────────

// POST /api/shop/discounts/apply
router.post('/discounts/apply', authenticate, [
  body('code').trim().notEmpty(),
  body('orderAmount').isFloat({ min: 0 }),
], async (req, res) => {
  const { code, orderAmount } = req.body;
  try {
    const result = await query(
      `SELECT * FROM discount_codes
       WHERE UPPER(code) = UPPER($1)
         AND is_active = true
         AND (valid_until IS NULL OR valid_until > NOW())
         AND (max_uses IS NULL OR uses_count < max_uses)
         AND min_order_amount <= $2`,
      [code, parseFloat(orderAmount)]
    );
    if (!result.rows.length) {
      return res.status(400).json({ message: 'Invalid or expired discount code' });
    }
    const discount = result.rows[0];
    const discountAmount = discount.discount_type === 'percent'
      ? (parseFloat(orderAmount) * discount.discount_value / 100).toFixed(2)
      : Math.min(discount.discount_value, parseFloat(orderAmount)).toFixed(2);

    res.json({
      valid: true,
      code: discount.code,
      discountType: discount.discount_type,
      discountValue: discount.discount_value,
      discountAmount: parseFloat(discountAmount),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to validate discount code' });
  }
});

// ─── Shipping ────────────────────────────────────────────────────────────────

// GET /api/shop/shipping/methods
router.get('/shipping/methods', (req, res) => {
  res.json({
    methods: [
      { id: 'standard', name: 'Standard Shipping', estimatedDays: '5-7', price: 9.99 },
      { id: 'express', name: 'Express Shipping', estimatedDays: '2-3', price: 19.99 },
      { id: 'overnight', name: 'Overnight Delivery', estimatedDays: '1', price: 39.99 },
      { id: 'free', name: 'Free Shipping', estimatedDays: '7-10', price: 0, minOrderAmount: 100 },
    ],
  });
});

// POST /api/shop/shipping/calculate
router.post('/shipping/calculate', async (req, res) => {
  const { method = 'standard', orderAmount = 0 } = req.body;
  const rates = { standard: 9.99, express: 19.99, overnight: 39.99, free: 0 };
  const cost = parseFloat(orderAmount) >= 100 ? 0 : (rates[method] || 9.99);
  res.json({ method, cost, freeShippingThreshold: 100, qualifiesForFree: parseFloat(orderAmount) >= 100 });
});

// ─── Payment ─────────────────────────────────────────────────────────────────

// POST /api/shop/payment/intent
router.post('/payment/intent', authenticate, async (req, res) => {
  const { amount, currency = 'usd', orderId } = req.body;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Valid amount required' });
  }

  try {
    let clientSecret;
    let paymentIntentId;

    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key') {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // cents
        currency,
        metadata: { userId: req.user.id, orderId: orderId || '' },
      });
      clientSecret = intent.client_secret;
      paymentIntentId = intent.id;
    } else {
      // Mock for development
      paymentIntentId = `pi_mock_${Date.now()}`;
      clientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`;
    }

    res.json({ clientSecret, paymentIntentId, amount, currency });
  } catch (err) {
    console.error('Payment intent error:', err);
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// GET /api/shop/payment/cards
router.get('/payment/cards', authenticate, async (req, res) => {
  // In production, retrieve from Stripe customer
  res.json({ cards: [] });
});

// ─── Orders ──────────────────────────────────────────────────────────────────

// POST /api/shop/orders
router.post('/orders', authenticate, [
  body('shippingAddress').isObject(),
  body('shippingMethod').notEmpty(),
  body('paymentIntentId').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Missing required order fields', errors: errors.array() });
  }

  const {
    shippingAddress, billingAddress, shippingMethod,
    paymentIntentId, discountCode, notes,
  } = req.body;

  try {
    // Get cart items
    const cartResult = await query(
      `SELECT ci.*, p.name, p.price, p.inventory_count, p.slug
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );

    if (!cartResult.rows.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Verify stock
    for (const item of cartResult.rows) {
      if (item.inventory_count < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.name}` });
      }
    }

    const subtotal = cartResult.rows.reduce(
      (sum, item) => sum + (parseFloat(item.price) * item.quantity), 0
    );

    // Calculate discount
    let discountAmount = 0;
    if (discountCode) {
      const dc = await query(
        `SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($1) AND is_active = true`,
        [discountCode]
      );
      if (dc.rows.length) {
        const d = dc.rows[0];
        discountAmount = d.discount_type === 'percent'
          ? subtotal * d.discount_value / 100
          : Math.min(d.discount_value, subtotal);
        await query(
          'UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = $1',
          [d.id]
        );
      }
    }

    const shippingRates = { standard: 9.99, express: 19.99, overnight: 39.99, free: 0 };
    const shippingCost = subtotal >= 100 ? 0 : (shippingRates[shippingMethod] || 9.99);
    const tax = (subtotal - discountAmount) * 0.08; // 8% tax
    const total = subtotal - discountAmount + shippingCost + tax;

    // Create order
    const orderResult = await query(
      `INSERT INTO orders
         (user_id, status, subtotal, tax, shipping_cost, discount_amount, total,
          discount_code, shipping_address, billing_address, shipping_method,
          payment_intent_id, payment_status, notes)
       VALUES ($1, 'processing', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'paid', $12)
       RETURNING *`,
      [
        req.user.id, subtotal.toFixed(2), tax.toFixed(2), shippingCost.toFixed(2),
        discountAmount.toFixed(2), total.toFixed(2), discountCode || null,
        JSON.stringify(shippingAddress), JSON.stringify(billingAddress || shippingAddress),
        shippingMethod, paymentIntentId, notes || null,
      ]
    );

    const order = orderResult.rows[0];

    // Create order items & reduce inventory
    for (const item of cartResult.rows) {
      await query(
        `INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.product_id, item.name, item.quantity,
         item.price, (parseFloat(item.price) * item.quantity).toFixed(2)]
      );
      await query(
        'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// GET /api/shop/orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.id, o.status, o.total, o.payment_status, o.created_at, o.tracking_number,
              json_agg(json_build_object(
                'name', oi.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
              )) AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// GET /api/shop/orders/history
router.get('/orders/history', authenticate, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const total = await query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [req.user.id]);
    const result = await query(
      `SELECT o.*, json_agg(json_build_object(
                'id', oi.id, 'name', oi.name, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'total_price', oi.total_price
              )) AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );
    res.json({
      orders: result.rows,
      totalCount: parseInt(total.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(total.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order history' });
  }
});

// GET /api/shop/orders/:orderId
router.get('/orders/:orderId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, json_agg(json_build_object(
                'id', oi.id, 'name', oi.name, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'total_price', oi.total_price,
                'product_id', oi.product_id
              )) AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [req.params.orderId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// GET /api/shop/orders/:orderId/track
router.get('/orders/:orderId/track', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, status, tracking_number, shipping_method, created_at, updated_at FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.orderId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = result.rows[0];

    const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];
    const currentStep = statusSteps.indexOf(order.status);

    res.json({
      ...order,
      trackingSteps: statusSteps.map((step, i) => ({
        status: step,
        completed: i <= currentStep,
        current: i === currentStep,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to track order' });
  }
});

module.exports = router;
