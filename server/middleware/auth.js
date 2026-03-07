const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'hackersphere-dev-secret-change-in-production';

/**
 * Middleware: require a valid JWT token
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Confirm user still exists and is active
    const result = await query(
      'SELECT id, email, username, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'User account not found or deactivated' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware: require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * Middleware: optional auth — attach user if token present, but don't block
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await query(
      'SELECT id, email, username, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
  } catch (_) { /* ignore */ }
  next();
};

const signToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

module.exports = { authenticate, requireAdmin, optionalAuth, signToken };
