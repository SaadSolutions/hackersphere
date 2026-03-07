const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, courses, products, orders, revenue] = await Promise.all([
      query('SELECT COUNT(*) FROM users WHERE role != $1', ['admin']),
      query('SELECT COUNT(*) FROM courses'),
      query('SELECT COUNT(*) FROM products'),
      query('SELECT COUNT(*) FROM orders'),
      query(`SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE payment_status = 'paid'`),
    ]);

    const recentOrders = await query(
      `SELECT o.id, o.total, o.status, o.created_at, u.username, u.email
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalCourses: parseInt(courses.rows[0].count),
      totalProducts: parseInt(products.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const where = search
      ? `WHERE email ILIKE $3 OR username ILIKE $3`
      : '';
    const params = search
      ? [parseInt(limit), offset, `%${search}%`]
      : [parseInt(limit), offset];

    const total = await query(
      `SELECT COUNT(*) FROM users ${where}`,
      search ? [`%${search}%`] : []
    );
    const result = await query(
      `SELECT id, email, username, first_name, last_name, role, is_active, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({
      users: result.rows,
      totalCount: parseInt(total.rows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.patch('/users/:userId', [
  body('role').optional().isIn(['user', 'admin', 'instructor']),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const { role, isActive } = req.body;
  try {
    const result = await query(
      `UPDATE users
       SET role = COALESCE($1, role), is_active = COALESCE($2, is_active)
       WHERE id = $3 RETURNING id, email, username, role, is_active`,
      [role || null, isActive !== undefined ? isActive : null, req.params.userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// ─── Courses ─────────────────────────────────────────────────────────────────

router.get('/courses', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const total = await query('SELECT COUNT(*) FROM courses');
    const result = await query(
      `SELECT c.*, COUNT(DISTINCT e.id) AS enrollments
       FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    res.json({ courses: result.rows, totalCount: parseInt(total.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

router.post('/courses', [
  body('title').trim().notEmpty(),
  body('slug').trim().notEmpty(),
  body('difficultyLevel').isIn(['beginner', 'intermediate', 'advanced']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

  const {
    title, slug, description, shortDescription, difficultyLevel,
    category, estimatedDurationHours, isFeatured, price, thumbnailUrl, tags,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO courses (title, slug, description, short_description, difficulty_level,
         category, estimated_duration_hours, is_featured, price, thumbnail_url, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title, slug, description, shortDescription, difficultyLevel, category,
       estimatedDurationHours || 0, isFeatured || false, price || 0, thumbnailUrl, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Course slug already exists' });
    res.status(500).json({ message: 'Failed to create course' });
  }
});

router.put('/courses/:courseId', async (req, res) => {
  const {
    title, description, shortDescription, difficultyLevel, category,
    estimatedDurationHours, isFeatured, isPublished, price, thumbnailUrl, tags,
  } = req.body;
  try {
    const result = await query(
      `UPDATE courses SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         short_description = COALESCE($3, short_description),
         difficulty_level = COALESCE($4, difficulty_level),
         category = COALESCE($5, category),
         estimated_duration_hours = COALESCE($6, estimated_duration_hours),
         is_featured = COALESCE($7, is_featured),
         is_published = COALESCE($8, is_published),
         price = COALESCE($9, price),
         thumbnail_url = COALESCE($10, thumbnail_url),
         tags = COALESCE($11, tags)
       WHERE id = $12 RETURNING *`,
      [title, description, shortDescription, difficultyLevel, category,
       estimatedDurationHours, isFeatured, isPublished, price, thumbnailUrl, tags,
       req.params.courseId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Course not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update course' });
  }
});

router.delete('/courses/:courseId', async (req, res) => {
  try {
    await query('DELETE FROM courses WHERE id = $1', [req.params.courseId]);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// ─── Products ─────────────────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const total = await query('SELECT COUNT(*) FROM products');
    const result = await query(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), offset]
    );
    res.json({ products: result.rows, totalCount: parseInt(total.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

router.post('/products', [
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

  const {
    name, slug, description, shortDescription, price, comparePrice,
    category, inventoryCount, images, features, specifications, isFeatured, tags,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO products (name, slug, description, short_description, price, compare_price,
         category, inventory_count, images, features, specifications, is_featured, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, slug, description, shortDescription, price, comparePrice || null,
       category, inventoryCount || 0,
       JSON.stringify(images || []), JSON.stringify(features || []),
       JSON.stringify(specifications || {}), isFeatured || false, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Product slug already exists' });
    res.status(500).json({ message: 'Failed to create product' });
  }
});

router.put('/products/:productId', async (req, res) => {
  const {
    name, description, shortDescription, price, comparePrice, category,
    inventoryCount, images, features, specifications, isFeatured, isActive, tags,
  } = req.body;
  try {
    const result = await query(
      `UPDATE products SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         short_description = COALESCE($3, short_description),
         price = COALESCE($4, price),
         compare_price = COALESCE($5, compare_price),
         category = COALESCE($6, category),
         inventory_count = COALESCE($7, inventory_count),
         is_featured = COALESCE($8, is_featured),
         is_active = COALESCE($9, is_active),
         tags = COALESCE($10, tags)
       WHERE id = $11 RETURNING *`,
      [name, description, shortDescription, price, comparePrice, category,
       inventoryCount, isFeatured, isActive, tags, req.params.productId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product' });
  }
});

router.delete('/products/:productId', async (req, res) => {
  try {
    await query('UPDATE products SET is_active = false WHERE id = $1', [req.params.productId]);
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// ─── Orders ──────────────────────────────────────────────────────────────────

router.get('/orders', async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = status ? `WHERE o.status = $3` : '';
  const params = status ? [parseInt(limit), offset, status] : [parseInt(limit), offset];
  try {
    const total = await query(`SELECT COUNT(*) FROM orders o ${where}`, status ? [status] : []);
    const result = await query(
      `SELECT o.id, o.status, o.total, o.payment_status, o.created_at, o.tracking_number,
              u.username, u.email
       FROM orders o JOIN users u ON u.id = o.user_id ${where}
       ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ orders: result.rows, totalCount: parseInt(total.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

router.patch('/orders/:orderId', [
  body('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('trackingNumber').optional().trim(),
], async (req, res) => {
  const { status, trackingNumber } = req.body;
  try {
    const result = await query(
      `UPDATE orders SET
         status = COALESCE($1, status),
         tracking_number = COALESCE($2, tracking_number)
       WHERE id = $3 RETURNING *`,
      [status || null, trackingNumber || null, req.params.orderId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order' });
  }
});

module.exports = router;
