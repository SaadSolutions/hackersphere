# HackerSphere Backend Server

Node.js/Express REST API for HackerSphere Academy and Shop.

## Quick Start

```bash
cd server
cp .env.example .env       # Edit with your DB credentials
npm install
node db/setup.js --seed    # Create tables and seed data
npm start                  # Start server on :5000
```

## Database Setup

Requires PostgreSQL 12+:

```bash
createdb hackersphere
node db/setup.js --seed
```

Demo credentials after seeding:
- **Admin:** admin@hackersphere.com / Admin@123
- **User:** demo@hackersphere.com / Admin@123

## Stripe Integration

1. Create account at https://stripe.com
2. Add keys to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Add publishable key to `shop/checkout.html`:
   ```html
   <script>window.STRIPE_PUBLISHABLE_KEY = 'pk_test_...';</script>
   ```

## API Routes

| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Required |
| PUT | /api/auth/me | Required |
| PUT | /api/auth/password | Required |
| GET | /api/academy/courses | Public |
| GET | /api/academy/courses/:slug | Public |
| POST | /api/academy/courses/:id/enroll | Required |
| GET | /api/academy/lessons/:id | Required |
| POST | /api/academy/lessons/:id/complete | Required |
| GET | /api/academy/progress/courses | Required |
| GET | /api/shop/products | Public |
| GET | /api/shop/cart | Required |
| POST | /api/shop/cart | Required |
| POST | /api/shop/orders | Required |
| GET | /api/shop/orders/history | Required |
| GET | /api/admin/stats | Admin only |
| GET | /api/admin/users | Admin only |
| GET | /api/admin/courses | Admin only |
| GET | /api/admin/products | Admin only |
| GET | /api/admin/orders | Admin only |
