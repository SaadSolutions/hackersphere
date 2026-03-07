const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Handled by frontend
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5500', 'null'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const { pool } = require('./config/db');
  let dbStatus = 'disconnected';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (_) {}
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/academy', require('./routes/academy'));
app.use('/api/shop',    require('./routes/shop'));
app.use('/api/admin',   require('./routes/admin'));

// Stripe webhook (raw body required)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret === 'whsec_your_stripe_webhook_secret') {
    return res.json({ received: true }); // Dev mode
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const { query } = require('./config/db');
      await query(
        `UPDATE orders SET payment_status = 'paid', status = 'processing'
         WHERE payment_intent_id = $1`,
        [pi.id]
      );
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ message: `Webhook error: ${err.message}` });
  }
});

// ─── Serve Static Frontend ────────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// SPA fallback for known frontend routes
const frontendRoutes = ['/academy', '/shop', '/profile', '/admin', '/search'];
frontendRoutes.forEach(route => {
  app.get(`${route}*`, (req, res) => {
    // Serve the appropriate HTML file
    const htmlMap = {
      '/academy/login': 'academy/login.html',
      '/academy/register': 'academy/register.html',
      '/academy/catalog': 'academy/catalog.html',
      '/academy/dashboard': 'academy/dashboard.html',
      '/academy/course': 'academy/course.html',
      '/academy/lesson': 'academy/lesson.html',
      '/shop': 'shop/index.html',
      '/shop/cart': 'shop/cart.html',
      '/shop/checkout': 'shop/checkout.html',
      '/shop/product': 'shop/product.html',
      '/shop/orders': 'shop/orders.html',
      '/profile': 'profile.html',
      '/admin': 'admin/index.html',
      '/search': 'search.html',
    };
    const matched = Object.entries(htmlMap).find(([k]) => req.path.startsWith(k));
    if (matched) {
      res.sendFile(path.join(frontendPath, matched[1]));
    } else {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 HackerSphere API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\nAvailable routes:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/academy/courses');
  console.log('  GET  /api/shop/products');
  console.log('  GET  /api/admin/stats  (admin only)');
});

module.exports = app;
